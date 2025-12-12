const vertexShaderSource = `
    attribute vec3 a_position;
    attribute vec3 a_normal;

    varying vec3 v_normal;
    varying vec3 v_surfaceToLight;
    varying vec3 v_surfaceToView;

    uniform mat4 u_modelViewMatrix;
    uniform mat4 u_viewingMatrix;
    uniform mat4 u_projectionMatrix;
    uniform mat4 u_inverseTransposeModelViewMatrix;
    
    uniform vec3 u_lightPosition;
    uniform vec3 u_viewPosition;

    void main() {
        gl_Position = u_projectionMatrix * u_viewingMatrix * u_modelViewMatrix * vec4(a_position, 1.0);
        v_normal = normalize(mat3(u_inverseTransposeModelViewMatrix) * a_normal);
        vec3 surfacePosition = (u_modelViewMatrix * vec4(a_position, 1)).xyz;
        v_surfaceToLight = u_lightPosition - surfacePosition;
        v_surfaceToView = u_viewPosition - surfacePosition;
    }
`;

const fragmentShaderSource = `
    precision mediump float;
    
    uniform vec3 u_color;

    varying vec3 v_normal;
    varying vec3 v_surfaceToLight;
    varying vec3 v_surfaceToView;
    
    void main() {
        vec3 ambientReflection = u_color;
        vec3 diffuseReflection = u_color;
        vec3 specularReflection = vec3(1.0,1.0,1.0);

        gl_FragColor = vec4(diffuseReflection, 1);

        vec3 normal = normalize(v_normal);
        vec3 surfaceToLightDirection = normalize(v_surfaceToLight);
        vec3 surfaceToViewDirection = normalize(v_surfaceToView);
        vec3 halfVector = normalize(surfaceToLightDirection + surfaceToViewDirection);

        float light = dot(surfaceToLightDirection,normal);
        float specular = 0.0;
        if (light > 0.0) {
            specular = pow(dot(normal, halfVector), 250.0);
        }

        gl_FragColor.rgb = 0.5*ambientReflection + 0.5*light*diffuseReflection;
        gl_FragColor.rgb += specular*specularReflection;
    }
`;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Error compiling shader:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Error linking program:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }

    return program;
}

function setCubeVertices(side){
  let v = side/2;
  return new Float32Array([
      // Front
      v, v, v,
      v, -v, v,
      -v, v, v,
      -v, v, v,
      v, -v, v,
      -v, -v, v,
  
      // Left
      -v, v, v,
      -v, -v, v,
      -v, v, -v,
      -v, v, -v,
      -v, -v, v,
      -v, -v, -v,
  
      // Back
      -v, v, -v,
      -v, -v, -v,
      v, v, -v,
      v, v, -v,
      -v, -v, -v,
      v, -v, -v,
  
      // Right
      v, v, -v,
      v, -v, -v,
      v, v, v,
      v, v, v,
      v, -v, v,
      v, -v, -v,
  
      // Top
      v, v, v,
      v, v, -v,
      -v, v, v,
      -v, v, v,
      v, v, -v,
      -v, v, -v,
  
      // Bottom
      v, -v, v,
      v, -v, -v,
      -v, -v, v,
      -v, -v, v,
      v, -v, -v,
      -v, -v, -v,
  ]);
}

function setCubeNormals() {
  const normals = [];

  const faceNormals = [
    [ 0,  0,  1], // front
    [-1,  0,  0], // left
    [ 0,  0, -1], // back
    [ 1,  0,  0], // right
    [ 0,  1,  0], // top
    [ 0, -1,  0], // bottom
  ];

  for (let f = 0; f < 6; f++) {
    for (let i = 0; i < 6; i++) {
      normals.push(...faceNormals[f]);
    }
  }

  return new Float32Array(normals);
}

function main() {
    const canvas = document.getElementById('glCanvas');
    const gl = canvas.getContext('webgl');

    if (!gl) {
        console.error('WebGL not supported');
        return;
    }

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    const program = createProgram(gl, vertexShader, fragmentShader);
    gl.useProgram(program);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const normalLocation = gl.getAttribLocation(program, 'a_normal');

    const VertexBuffer = gl.createBuffer();
    const NormalBuffer = gl.createBuffer();
    
    const colorUniformLocation = gl.getUniformLocation(program, 'u_color');

    const modelViewMatrixUniformLocation = gl.getUniformLocation(program,'u_modelViewMatrix');
    const viewingMatrixUniformLocation = gl.getUniformLocation(program,'u_viewingMatrix');
    const projectionMatrixUniformLocation = gl.getUniformLocation(program,'u_projectionMatrix');
    const inverseTransposeModelViewMatrixUniformLocation = gl.getUniformLocation(program, `u_inverseTransposeModelViewMatrix`);

    const lightPositionUniformLocation = gl.getUniformLocation(program,'u_lightPosition');
    const viewPositionUniformLocation = gl.getUniformLocation(program,'u_viewPosition');

    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(1.0, 0.71, 0.75, 1.0); // Rosa bebe

    let modelViewMatrix = [];
    let inverseTransposeModelViewMatrix = [];

    let P0 = [0.0,0.0,2.0];
    let Pref = [0.0,0.0,0.0];
    const V = [0.0,1.0,0.0];
    let viewingMatrix = m4.setViewingMatrix(P0,Pref,V);

    // --- CORREÇÃO DO ASPECT RATIO ---
    const aspect = canvas.width / canvas.height;
    const yw_min = -1.0;
    const yw_max = 1.0;
    const xw_min = yw_min * aspect;
    const xw_max = yw_max * aspect;
    const z_near = -1.0;
    const z_far = -60.0;
    const projectionMatrix = m4.setPerspectiveProjectionMatrix(xw_min,xw_max,yw_min,yw_max,z_near,z_far);

    // --- Runner: estado do jogo ---
    const laneOffset = 2.5;
    const lanes = [-laneOffset, 0.0, laneOffset];
    let currentLane = 1;

    let posX = lanes[currentLane];
    let posY = 0.4;
    let posZ = 0.0;

    let rotacao = 180;

    const floorY = -1.2;

    let walkCycle = 0;
    let gameOver = false;

    let obstacles = [];
    let spawnTimer = 0;

    const baseSpeed = 8.0; // unidades por segundo
    let speed = baseSpeed;

    const basePosY = 0.4;
    let velY = 0.0;
    let isJumping = false;

    const gravity = -25.0;   // mais negativo = cai mais rápido
    const jumpVel = 10.5;    // maior = pula mais alto

    function resetGame() {
        currentLane = 1;
        posX = lanes[currentLane];
        posY = basePosY;
        posZ = 0.0;
        rotacao = 180;
        walkCycle = 0;
        gameOver = false;
        obstacles = [];
        spawnTimer = 0;
        speed = baseSpeed;
    }

    function spawnObstacle() {
        const lane = Math.floor(Math.random() * 3);
        const ahead = 35.0;
        const z = posZ - ahead;

        obstacles.push({
            lane,
            z,
            sx: 0.9,
            sy: 1.2,
            sz: 0.9,
        });
    }

    function updateGame(dt) {
        if (dt <= 0) return;

        if (!gameOver) {
            posZ -= speed * dt;
            walkCycle += dt * 10.0;

            spawnTimer += dt;
            if (spawnTimer >= 0.9) {
                spawnTimer = 0;
                spawnObstacle();
            }

            for (const o of obstacles) {
                const sameLane = o.lane === currentLane;
                const closeZ = Math.abs(o.z - posZ) < 1.1;
                const lowEnoughToHit = posY < basePosY + 0.7; // se estiver acima disso, “passa por cima”
                if (sameLane && closeZ && lowEnoughToHit) {
                    gameOver = true;
                    break;
                }
            }

            obstacles = obstacles.filter((o) => o.z <= posZ + 6.0);
        } else {
            walkCycle = 0;
        }

        // Física do pulo
        velY += gravity * dt;
        posY += velY * dt;

        if (posY <= basePosY) {
            posY = basePosY;
            velY = 0.0;
            isJumping = false;
        }
    }

    document.addEventListener('keydown', (e) => {
        const k = e.key.toLowerCase();
        if (k === 'r') {
            resetGame();
            return;
        }
        if (gameOver) return;

        if (k === 'arrowleft' || k === 'a') {
            currentLane = Math.max(0, currentLane - 1);
            posX = lanes[currentLane];
        }
        if (k === 'arrowright' || k === 'd') {
            currentLane = Math.min(2, currentLane + 1);
            posX = lanes[currentLane];
        }
        if ((e.code === 'Space' || k === 'arrowup') && !gameOver) {
            if (!isJumping) {
                velY = jumpVel;
                isJumping = true;
            }
        }
    });

    function drawCube(tam, r, g, b, add_x, add_y, add_z, sx, sy, sz, isStatic = false) {
        const vertices = setCubeVertices(tam);

        gl.enableVertexAttribArray(positionLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, VertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

        const cubeNormals = setCubeNormals();
        gl.bindBuffer(gl.ARRAY_BUFFER, NormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, cubeNormals, gl.STATIC_DRAW);
        gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(normalLocation);
        
        modelViewMatrix = m4.identity();
        modelViewMatrix = m4.scale(modelViewMatrix, sx, sy, sz);
        modelViewMatrix = m4.xRotate(modelViewMatrix,degToRad(theta_x));
        modelViewMatrix = m4.yRotate(modelViewMatrix,degToRad(theta_y));
        modelViewMatrix = m4.zRotate(modelViewMatrix,degToRad(theta_z));
        modelViewMatrix = m4.translate(modelViewMatrix, add_x, add_y + 0.5, add_z);
        
        if (!isStatic) {
            modelViewMatrix = m4.yRotate(modelViewMatrix, degToRad(rotacao));
            modelViewMatrix = m4.translate(modelViewMatrix, posX, posY, posZ);
        }

        inverseTransposeModelViewMatrix = m4.transpose(m4.inverse(modelViewMatrix));
        
        gl.uniformMatrix4fv(modelViewMatrixUniformLocation,false,modelViewMatrix);
        gl.uniformMatrix4fv(inverseTransposeModelViewMatrixUniformLocation,false,inverseTransposeModelViewMatrix);
        gl.uniformMatrix4fv(viewingMatrixUniformLocation,false,viewingMatrix);
        gl.uniformMatrix4fv(projectionMatrixUniformLocation,false,projectionMatrix);
        
        gl.uniform3fv(colorUniformLocation, new Float32Array([r,g,b]));
        gl.uniform3fv(viewPositionUniformLocation, new Float32Array(P0));
        gl.uniform3fv(lightPositionUniformLocation, new Float32Array([2.0,2.0,3.0]));

        gl.drawArrays(gl.TRIANGLES, 0, 6*6);
    }

    function drawTrack() {
        const laneWidth = 2.5;
        const segmentLength = 12.0;

        const baseIndex = Math.floor((-posZ) / segmentLength);
        const from = baseIndex - 2;
        const to = baseIndex + 16;

        for (let i = from; i <= to; i++) {
            const zCenter = -((i * segmentLength) + segmentLength / 2);

            const odd = (i % 2) !== 0;
            const r1 = 1.0, g1 = odd ? 0.90 : 0.86, b1 = odd ? 0.90 : 0.86;
            const r2 = 1.0, g2 = odd ? 0.84 : 0.80, b2 = odd ? 0.84 : 0.80;

            drawCube(1.0, r2, g2, b2, -laneWidth, floorY, zCenter, laneWidth, 0.1, segmentLength, true);
            drawCube(1.0, r1, g1, b1, 0,         floorY, zCenter, laneWidth, 0.1, segmentLength, true);
            drawCube(1.0, r2, g2, b2, laneWidth,  floorY, zCenter, laneWidth, 0.1, segmentLength, true);
        }
    }

    function drawObstacles() {
        const rO = 0.55, gO = 0.22, bO = 0.22;
        for (const o of obstacles) {
            drawCube(1.0, rO, gO, bO, lanes[o.lane], floorY, o.z, o.sx, o.sy, o.sz, true);
        }
    }

    function updateCamera() {
        const camDist = 6.0;
        const camHeight = 4.0;

        P0 = [posX, camHeight, posZ + camDist];
        Pref = [posX, 0.0, posZ - 6.0];

        viewingMatrix = m4.setViewingMatrix(P0, Pref, V);
        gl.uniformMatrix4fv(viewingMatrixUniformLocation, false, viewingMatrix);
    }

    let theta_x = 0; let theta_y = 0; let theta_z = 0;

    let lastTimeMs = 0;
    function frame(timeMs) {
        const dt = lastTimeMs ? (timeMs - lastTimeMs) / 1000 : 0;
        lastTimeMs = timeMs;

        updateGame(dt);
        updateCamera();

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        drawTrack();
        drawObstacles();

        // Animação de balanço ao correr
        const legSwing = Math.sin(walkCycle) * 15;
        const armSwing = Math.sin(walkCycle) * 10;
        const bodyBounce = Math.abs(Math.sin(walkCycle)) * 0.05;

        // Cores
        const rY = 0.99, gY = 0.96, bY = 0.69; // Amarelo
        const rB = 0.5, gB = 0.14, bB = 0.16; // Marrom (Boina)
        const rD = 0.2, gD = 0.1, bD = 0.0; // Escuro (Rosto dele)

        // Cabeça
        drawCube(1.0, rY, gY, bY, 0, bodyBounce, 0, 1.4, 1.1, 1.1); 
        
        // Boina
        drawCube(0.6, rB, gB, bB, 0, 0.6 + bodyBounce, 0, 1.3, 0.4, 1.3);
        drawCube(0.2, rB, gB, bB, 0, 0.8 + bodyBounce, 0, 1.0, 1.5, 1.0);

        // Orelhas
        theta_z = -25;
        drawCube(0.4, rY, gY, bY, -0.8, 0.1 + bodyBounce, 0, 1.2, 2.8, 0.8);
        theta_z = 25;
        drawCube(0.4, rY, gY, bY, 0.8, 0.1 + bodyBounce, 0, 1.2, 2.8, 0.8);
        theta_z = 0;

        // Olhos
        drawCube(0.08, rD, gD, bD, -0.3, -0.05 + bodyBounce, 0.56, 1.0, 1.0, 1.0);
        drawCube(0.08, rD, gD, bD, 0.3, -0.05 + bodyBounce, 0.56, 1.0, 1.0, 1.0);

        // Nariz/Boca
        drawCube(0.08, rD, gD, bD, 0, -0.15 + bodyBounce, 0.56, 1.5, 1.0, 1.0);
        drawCube(0.05, rD, gD, bD, 0, -0.1 + bodyBounce, 0.58, 1.0, 1.0, 1.0);

        // Corpo
        drawCube(1.0, rY, gY, bY, 0, -0.9 + bodyBounce, 0, 1.2, 1.0, 0.9);
        
        // Rabinho
        drawCube(0.2, rY, gY, bY, 0, -1.1 + bodyBounce, -0.5, 1.0, 1.0, 1.0);

        // Braços
        theta_x = armSwing;
        drawCube(0.3, rY, gY, bY, -0.7, -0.8 + bodyBounce, 0.2, 1.0, 1.5, 1.0);
        theta_x = -armSwing;
        drawCube(0.3, rY, gY, bY, 0.7, -0.8 + bodyBounce, 0.2, 1.0, 1.5, 1.0);
        theta_x = 0;
        
        // Pernas
        theta_x = legSwing;
        drawCube(0.35, rY, gY, bY, -0.35, -1.4, 0.1, 1.1, 0.8, 1.2);
        theta_x = -legSwing;
        drawCube(0.35, rY, gY, bY, 0.35, -1.4, 0.1, 1.1, 0.8, 1.2);
        theta_x = 0;

        requestAnimationFrame(frame);
    }

    resetGame();
    requestAnimationFrame(frame);
}

function crossProduct(v1, v2) {
  return [
      v1[1] * v2[2] - v1[2] * v2[1],
      v1[2] * v2[0] - v1[0] * v2[2],
      v1[0] * v2[1] - v1[1] * v2[0]
  ];
}

function unitVector(v){ 
    let vModulus = vectorModulus(v);
    return v.map(function(x) { return x/vModulus; });
}

function vectorModulus(v){
    return Math.sqrt(Math.pow(v[0],2)+Math.pow(v[1],2)+Math.pow(v[2],2));
}

function radToDeg(r) {
  return r * 180 / Math.PI;
}

function degToRad(d) {
  return d * Math.PI / 180;
}

main();