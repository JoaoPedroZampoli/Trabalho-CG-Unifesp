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

// === SHADERS GOURAUD COM TEXTURA ===
const vertexShaderSourceGouraudTexture = `
    attribute vec3 a_position;
    attribute vec3 a_normal;
    attribute vec2 a_texcoord;

    varying vec2 v_texcoord;
    varying float v_light;

    uniform mat4 u_modelViewMatrix;
    uniform mat4 u_viewingMatrix;
    uniform mat4 u_projectionMatrix;
    uniform mat4 u_inverseTransposeModelViewMatrix;
    
    uniform vec3 u_lightPosition;
    uniform vec3 u_viewPosition;

    void main() {
        gl_Position = u_projectionMatrix * u_viewingMatrix * u_modelViewMatrix * vec4(a_position, 1.0);
        
        vec3 normal = normalize(mat3(u_inverseTransposeModelViewMatrix) * a_normal);
        vec3 surfacePosition = (u_modelViewMatrix * vec4(a_position, 1.0)).xyz;
        
        vec3 surfaceToLight = normalize(u_lightPosition - surfacePosition);
        
        // Iluminação Gouraud simples
        float diffuse = max(dot(normal, surfaceToLight), 0.0);
        v_light = 0.4 + 0.6 * diffuse;
        
        v_texcoord = a_texcoord;
    }
`;

const fragmentShaderSourceGouraudTexture = `
    precision mediump float;
    
    varying vec2 v_texcoord;
    varying float v_light;
    
    uniform sampler2D u_texture;
    
    void main() {
        vec4 texColor = texture2D(u_texture, v_texcoord);
        gl_FragColor = vec4(texColor.rgb * v_light, texColor.a);
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
      v, v, v, v, -v, v, -v, v, v, -v, v, v, v, -v, v, -v, -v, v,
      -v, v, v, -v, -v, v, -v, v, -v, -v, v, -v, -v, -v, v, -v, -v, -v,
      -v, v, -v, -v, -v, -v, v, v, -v, v, v, -v, -v, -v, -v, v, -v, -v,
      v, v, -v, v, -v, -v, v, v, v, v, v, v, v, -v, v, v, -v, -v,
      v, v, v, v, v, -v, -v, v, v, -v, v, v, v, v, -v, -v, v, -v,
      v, -v, v, v, -v, -v, -v, -v, v, -v, -v, v, v, -v, -v, -v, -v, -v,
  ]);
}

function setCubeNormals() {
  const normals = [];
  const faceNormals = [
    [0,0,1], [-1,0,0], [0,0,-1], [1,0,0], [0,1,0], [0,-1,0]
  ];
  for (let f = 0; f < 6; f++) {
    for (let i = 0; i < 6; i++) normals.push(...faceNormals[f]);
  }
  return new Float32Array(normals);
}

// Função para criar ESFERA com coordenadas de textura
function createSphereWithTexture(radius, latBands, longBands) {
    const positions = [];
    const normals = [];
    const texcoords = [];

    for (let lat = 0; lat <= latBands; lat++) {
        const theta = (lat * Math.PI) / latBands;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);

        for (let lon = 0; lon <= longBands; lon++) {
            const phi = (lon * 2 * Math.PI) / longBands;
            const sinPhi = Math.sin(phi);
            const cosPhi = Math.cos(phi);

            const x = cosPhi * sinTheta;
            const y = cosTheta;
            const z = sinPhi * sinTheta;

            const u = lon / longBands;
            const v = lat / latBands;

            normals.push(x, y, z);
            positions.push(radius * x, radius * y, radius * z);
            texcoords.push(u, v);
        }
    }

    const indices = [];
    for (let lat = 0; lat < latBands; lat++) {
        for (let lon = 0; lon < longBands; lon++) {
            const first = lat * (longBands + 1) + lon;
            const second = first + longBands + 1;
            indices.push(first, second, first + 1);
            indices.push(second, second + 1, first + 1);
        }
    }

    const expandedPositions = [];
    const expandedNormals = [];
    const expandedTexcoords = [];

    for (let i = 0; i < indices.length; i++) {
        const idx = indices[i];
        expandedPositions.push(positions[idx * 3], positions[idx * 3 + 1], positions[idx * 3 + 2]);
        expandedNormals.push(normals[idx * 3], normals[idx * 3 + 1], normals[idx * 3 + 2]);
        expandedTexcoords.push(texcoords[idx * 2], texcoords[idx * 2 + 1]);
    }

    return {
        positions: new Float32Array(expandedPositions),
        normals: new Float32Array(expandedNormals),
        texcoords: new Float32Array(expandedTexcoords),
        vertexCount: indices.length
    };
}

// Função para criar DISCO com coordenadas de textura
function createDiscWithTexture(radius, height, segments) {
    const positions = [];
    const normals = [];
    const texcoords = [];

    // Topo - textura mapeada como círculo
    for (let i = 0; i < segments; i++) {
        const angle1 = (i / segments) * Math.PI * 2;
        const angle2 = ((i + 1) / segments) * Math.PI * 2;

        const x1 = Math.cos(angle1), z1 = Math.sin(angle1);
        const x2 = Math.cos(angle2), z2 = Math.sin(angle2);

        // Centro
        positions.push(0, height / 2, 0);
        normals.push(0, 1, 0);
        texcoords.push(0.5, 0.5);

        // Ponto 1
        positions.push(x1 * radius, height / 2, z1 * radius);
        normals.push(0, 1, 0);
        texcoords.push(0.5 + x1 * 0.5, 0.5 + z1 * 0.5);

        // Ponto 2
        positions.push(x2 * radius, height / 2, z2 * radius);
        normals.push(0, 1, 0);
        texcoords.push(0.5 + x2 * 0.5, 0.5 + z2 * 0.5);
    }

    // Base
    for (let i = 0; i < segments; i++) {
        const angle1 = (i / segments) * Math.PI * 2;
        const angle2 = ((i + 1) / segments) * Math.PI * 2;

        const x1 = Math.cos(angle1), z1 = Math.sin(angle1);
        const x2 = Math.cos(angle2), z2 = Math.sin(angle2);

        positions.push(0, -height / 2, 0);
        normals.push(0, -1, 0);
        texcoords.push(0.5, 0.5);

        positions.push(x2 * radius, -height / 2, z2 * radius);
        normals.push(0, -1, 0);
        texcoords.push(0.5 + x2 * 0.5, 0.5 + z2 * 0.5);

        positions.push(x1 * radius, -height / 2, z1 * radius);
        normals.push(0, -1, 0);
        texcoords.push(0.5 + x1 * 0.5, 0.5 + z1 * 0.5);
    }

    // Lateral
    for (let i = 0; i < segments; i++) {
        const angle1 = (i / segments) * Math.PI * 2;
        const angle2 = ((i + 1) / segments) * Math.PI * 2;

        const x1 = Math.cos(angle1), z1 = Math.sin(angle1);
        const x2 = Math.cos(angle2), z2 = Math.sin(angle2);

        const u1 = i / segments, u2 = (i + 1) / segments;

        positions.push(x1 * radius, height / 2, z1 * radius);
        normals.push(x1, 0, z1);
        texcoords.push(u1, 0);

        positions.push(x1 * radius, -height / 2, z1 * radius);
        normals.push(x1, 0, z1);
        texcoords.push(u1, 1);

        positions.push(x2 * radius, height / 2, z2 * radius);
        normals.push(x2, 0, z2);
        texcoords.push(u2, 0);

        positions.push(x2 * radius, height / 2, z2 * radius);
        normals.push(x2, 0, z2);
        texcoords.push(u2, 0);

        positions.push(x1 * radius, -height / 2, z1 * radius);
        normals.push(x1, 0, z1);
        texcoords.push(u1, 1);

        positions.push(x2 * radius, -height / 2, z2 * radius);
        normals.push(x2, 0, z2);
        texcoords.push(u2, 1);
    }

    return {
        positions: new Float32Array(positions),
        normals: new Float32Array(normals),
        texcoords: new Float32Array(texcoords),
        vertexCount: positions.length / 3
    };
}

// Função para carregar textura
function loadTexture(gl, url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Cor temporária enquanto carrega
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([128, 128, 128, 255]));

    const image = new Image();
    image.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        
        // Configuração para texturas que NÃO são potência de 2
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        
        console.log("Textura carregada:", url, image.width, "x", image.height);
    };
    image.onerror = function() {
        console.error("Erro ao carregar textura:", url);
    };
    image.src = url;

    return texture;
}

function main() {
    const canvas = document.getElementById('glCanvas');
    const gl = canvas.getContext('webgl');

    if (!gl) {
        console.error('WebGL not supported');
        return;
    }

    // Programa Phong (personagem e pista)
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = createProgram(gl, vertexShader, fragmentShader);

    // Programa Gouraud com Textura (obstáculos)
    const vertexShaderGouraudTex = createShader(gl, gl.VERTEX_SHADER, vertexShaderSourceGouraudTexture);
    const fragmentShaderGouraudTex = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSourceGouraudTexture);
    const programGouraudTex = createProgram(gl, vertexShaderGouraudTex, fragmentShaderGouraudTex);

    gl.useProgram(program);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const normalLocation = gl.getAttribLocation(program, 'a_normal');

    // Locations Gouraud Textura
    const positionLocationGouraudTex = gl.getAttribLocation(programGouraudTex, 'a_position');
    const normalLocationGouraudTex = gl.getAttribLocation(programGouraudTex, 'a_normal');
    const texcoordLocationGouraudTex = gl.getAttribLocation(programGouraudTex, 'a_texcoord');

    const VertexBuffer = gl.createBuffer();
    const NormalBuffer = gl.createBuffer();
    const TexcoordBuffer = gl.createBuffer();
    
    const colorUniformLocation = gl.getUniformLocation(program, 'u_color');
    const modelViewMatrixUniformLocation = gl.getUniformLocation(program,'u_modelViewMatrix');
    const viewingMatrixUniformLocation = gl.getUniformLocation(program,'u_viewingMatrix');
    const projectionMatrixUniformLocation = gl.getUniformLocation(program,'u_projectionMatrix');
    const inverseTransposeModelViewMatrixUniformLocation = gl.getUniformLocation(program, 'u_inverseTransposeModelViewMatrix');
    const lightPositionUniformLocation = gl.getUniformLocation(program,'u_lightPosition');
    const viewPositionUniformLocation = gl.getUniformLocation(program,'u_viewPosition');

    // Uniforms Gouraud Textura
    const modelViewMatrixUniformLocationGouraudTex = gl.getUniformLocation(programGouraudTex,'u_modelViewMatrix');
    const viewingMatrixUniformLocationGouraudTex = gl.getUniformLocation(programGouraudTex,'u_viewingMatrix');
    const projectionMatrixUniformLocationGouraudTex = gl.getUniformLocation(programGouraudTex,'u_projectionMatrix');
    const inverseTransposeModelViewMatrixUniformLocationGouraudTex = gl.getUniformLocation(programGouraudTex, 'u_inverseTransposeModelViewMatrix');
    const lightPositionUniformLocationGouraudTex = gl.getUniformLocation(programGouraudTex,'u_lightPosition');
    const viewPositionUniformLocationGouraudTex = gl.getUniformLocation(programGouraudTex,'u_viewPosition');
    const textureUniformLocationGouraudTex = gl.getUniformLocation(programGouraudTex, 'u_texture');

    // Carregar texturas
    const textureBrigadeiro = loadTexture(gl, 'Pista-Pompompurin/brigadeiro.jpg');
    const texturePeppermint = loadTexture(gl, 'Pista-Pompompurin/peppermint.png');
    
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(1.0, 0.71, 0.75, 1.0);

    let modelViewMatrix = [];
    let inverseTransposeModelViewMatrix = [];

    let P0 = [0.0,0.0,2.0];
    let Pref = [0.0,0.0,0.0];
    const V = [0.0,1.0,0.0];
    let viewingMatrix = m4.setViewingMatrix(P0,Pref,V);

    const aspect = canvas.width / canvas.height;
    const yw_min = -1.0;
    const yw_max = 1.0;
    const xw_min = yw_min * aspect;
    const xw_max = yw_max * aspect;
    const z_near = -1.0;
    const z_far = -60.0;
    const projectionMatrix = m4.setPerspectiveProjectionMatrix(xw_min,xw_max,yw_min,yw_max,z_near,z_far);

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

    const baseSpeed = 8.0;
    let speed = baseSpeed;

    const basePosY = 0.4;
    let velY = 0.0;
    let isJumping = false;

    const gravity = -25.0;
    const jumpVel = 10.5;

    let jogoIniciado = false;
    let lastTimeMs = 0;
    let theta_x = 0, theta_y = 0, theta_z = 0;

    // Variáveis de vitória
    let distPercorrida = 0;
    let distVitoria = 300;
    let vitoria = false;

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
        jogoIniciado = false;
        lastTimeMs = 0;
        distPercorrida = 0;  // Resetar distância
        vitoria = false;      // Resetar vitória
    }

    function spawnObstacle() {
        const lane = Math.floor(Math.random() * 3);
        const ahead = 35.0;
        const z = posZ - ahead;
        const type = Math.random() < 0.5 ? 'brigadeiro' : 'peppermint';

        obstacles.push({ lane, z, type });
    }

    function updateGame(dt) {
        if (dt <= 0) return;

        if (!gameOver && !vitoria) {
            posZ -= speed * dt;
            distPercorrida += speed * dt;  // Atualizar distância percorrida
            walkCycle += dt * 10.0;

            spawnTimer += dt;
            if (spawnTimer >= 0.9) {
                spawnTimer = 0;
                spawnObstacle();
            }

            for (const o of obstacles) {
                const sameLane = o.lane === currentLane;
                const closeZ = Math.abs(o.z - posZ) < 1.1;
                const lowEnoughToHit = posY < basePosY + 0.7;
                if (sameLane && closeZ && lowEnoughToHit) {
                    gameOver = true;
                    break;
                }
            }

            obstacles = obstacles.filter((o) => o.z <= posZ + 6.0);
        } else {
            walkCycle = 0;
        }

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

    posX = lanes[currentLane];

    const btnProxima = document.getElementById('botao-prox-fase');
    if (btnProxima) {
        btnProxima.addEventListener("click", () => {
            window.location.href = "index.html?fase=3";
        });
    }

    document.getElementById('botao-start').addEventListener("click", () => {
        jogoIniciado = true;
        document.getElementById('tela-start').style.display = "none";
        requestAnimationFrame(frame);
    });

    document.getElementById('botao-reset').addEventListener("click", () => {
        resetGame();
        document.getElementById('tela-gameover').style.display = "none";
        document.getElementById('tela-start').style.display = "flex";
    });

    function drawCube(tam, r, g, b, add_x, add_y, add_z, sx, sy, sz, isStatic = false) {
        gl.useProgram(program);
        
        const vertices = setCubeVertices(tam);

        gl.bindBuffer(gl.ARRAY_BUFFER, VertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

        const cubeNormals = setCubeNormals();
        gl.bindBuffer(gl.ARRAY_BUFFER, NormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, cubeNormals, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(normalLocation);
        gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);
        
        modelViewMatrix = m4.identity();
        modelViewMatrix = m4.scale(modelViewMatrix, sx, sy, sz);
        modelViewMatrix = m4.xRotate(modelViewMatrix, degToRad(theta_x));
        modelViewMatrix = m4.yRotate(modelViewMatrix, degToRad(theta_y));
        modelViewMatrix = m4.zRotate(modelViewMatrix, degToRad(theta_z));
        modelViewMatrix = m4.translate(modelViewMatrix, add_x, add_y + 0.5, add_z);
        
        if (!isStatic) {
            modelViewMatrix = m4.yRotate(modelViewMatrix, degToRad(rotacao));
            modelViewMatrix = m4.translate(modelViewMatrix, posX, posY, posZ);
        }

        inverseTransposeModelViewMatrix = m4.transpose(m4.inverse(modelViewMatrix));
        
        gl.uniformMatrix4fv(modelViewMatrixUniformLocation, false, modelViewMatrix);
        gl.uniformMatrix4fv(inverseTransposeModelViewMatrixUniformLocation, false, inverseTransposeModelViewMatrix);
        gl.uniformMatrix4fv(viewingMatrixUniformLocation, false, viewingMatrix);
        gl.uniformMatrix4fv(projectionMatrixUniformLocation, false, projectionMatrix);
        
        gl.uniform3fv(colorUniformLocation, new Float32Array([r, g, b]));
        gl.uniform3fv(viewPositionUniformLocation, new Float32Array(P0));
        gl.uniform3fv(lightPositionUniformLocation, new Float32Array([2.0, 2.0, posZ + 3.0]));

        gl.drawArrays(gl.TRIANGLES, 0, 6 * 6);
    }

    // Desenha ESFERA com Gouraud e Textura
    function drawSphereGouraudTexture(radius, texture, x, y, z, sx, sy, sz) {
        gl.useProgram(programGouraudTex);

        const sphere = createSphereWithTexture(radius, 24, 24);

        gl.bindBuffer(gl.ARRAY_BUFFER, VertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, sphere.positions, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(positionLocationGouraudTex);
        gl.vertexAttribPointer(positionLocationGouraudTex, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, NormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, sphere.normals, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(normalLocationGouraudTex);
        gl.vertexAttribPointer(normalLocationGouraudTex, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, TexcoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, sphere.texcoords, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(texcoordLocationGouraudTex);
        gl.vertexAttribPointer(texcoordLocationGouraudTex, 2, gl.FLOAT, false, 0, 0);

        let mvMatrix = m4.identity();
        mvMatrix = m4.scale(mvMatrix, sx, sy, sz);
        mvMatrix = m4.translate(mvMatrix, x, y, z);

        let invTranspose = m4.transpose(m4.inverse(mvMatrix));

        gl.uniformMatrix4fv(modelViewMatrixUniformLocationGouraudTex, false, mvMatrix);
        gl.uniformMatrix4fv(inverseTransposeModelViewMatrixUniformLocationGouraudTex, false, invTranspose);
        gl.uniformMatrix4fv(viewingMatrixUniformLocationGouraudTex, false, viewingMatrix);
        gl.uniformMatrix4fv(projectionMatrixUniformLocationGouraudTex, false, projectionMatrix);

        gl.uniform3fv(lightPositionUniformLocationGouraudTex, new Float32Array([2.0, 2.0, posZ + 3.0]));
        gl.uniform3fv(viewPositionUniformLocationGouraudTex, new Float32Array(P0));

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(textureUniformLocationGouraudTex, 0);

        gl.drawArrays(gl.TRIANGLES, 0, sphere.vertexCount);
    }

    // Desenha DISCO com Gouraud e Textura
    function drawDiscGouraudTexture(radius, height, texture, x, y, z, sx, sy, sz) {
        gl.useProgram(programGouraudTex);

        const disc = createDiscWithTexture(radius, height, 48);

        gl.bindBuffer(gl.ARRAY_BUFFER, VertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, disc.positions, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(positionLocationGouraudTex);
        gl.vertexAttribPointer(positionLocationGouraudTex, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, NormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, disc.normals, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(normalLocationGouraudTex);
        gl.vertexAttribPointer(normalLocationGouraudTex, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, TexcoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, disc.texcoords, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(texcoordLocationGouraudTex);
        gl.vertexAttribPointer(texcoordLocationGouraudTex, 2, gl.FLOAT, false, 0, 0);

        let mvMatrix = m4.identity();
        mvMatrix = m4.scale(mvMatrix, sx, sy, sz);
        mvMatrix = m4.translate(mvMatrix, x, y, z);

        let invTranspose = m4.transpose(m4.inverse(mvMatrix));

        gl.uniformMatrix4fv(modelViewMatrixUniformLocationGouraudTex, false, mvMatrix);
        gl.uniformMatrix4fv(inverseTransposeModelViewMatrixUniformLocationGouraudTex, false, invTranspose);
        gl.uniformMatrix4fv(viewingMatrixUniformLocationGouraudTex, false, viewingMatrix);
        gl.uniformMatrix4fv(projectionMatrixUniformLocationGouraudTex, false, projectionMatrix);

        gl.uniform3fv(lightPositionUniformLocationGouraudTex, new Float32Array([2.0, 2.0, posZ + 3.0]));
        gl.uniform3fv(viewPositionUniformLocationGouraudTex, new Float32Array(P0));

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(textureUniformLocationGouraudTex, 0);

        gl.drawArrays(gl.TRIANGLES, 0, disc.vertexCount);
    }

    // BRIGADEIRO - esfera com textura de granulado
    function drawBrigadeiro(x, y, z) {
        drawSphereGouraudTexture(0.5, textureBrigadeiro, x, y, z, 1.0, 1.0, 1.0);
    }

    // PEPPERMINT - dois discos empilhados com textura de espiral
    function drawPeppermint(x, y, z) {
        // Disco inferior (maior)
        drawDiscGouraudTexture(0.7, 0.15, texturePeppermint, x, y, z, 1.0, 1.0, 1.0);
        // Disco superior (um pouco menor, empilhado)
        drawDiscGouraudTexture(0.55, 0.15, texturePeppermint, x, y + 0.18, z, 1.0, 1.0, 1.0);
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
            drawCube(1.0, r1, g1, b1, 0, floorY, zCenter, laneWidth, 0.1, segmentLength, true);
            drawCube(1.0, r2, g2, b2, laneWidth, floorY, zCenter, laneWidth, 0.1, segmentLength, true);
        }
    }

    function drawObstacles() {
        for (const o of obstacles) {
            const x = lanes[o.lane];
            const z = o.z;
            
            if (o.type === 'brigadeiro') {
                drawBrigadeiro(x, floorY + 1.0, z);
            } else {
                drawPeppermint(x, floorY + 0.65, z);
            }
        }
    }

    function updateCamera() {
        const camDist = 6.0;
        const camHeight = 4.0;

        P0 = [posX, camHeight, posZ + camDist];
        Pref = [posX, 0.0, posZ - 6.0];

        viewingMatrix = m4.setViewingMatrix(P0, Pref, V);
    }

    function frame(timeMs) {
        if (!jogoIniciado) return;

        if (gameOver) {
            document.getElementById('tela-gameover').style.display = "flex";
            return;
        }

        // Verificar vitória
        if (distPercorrida >= distVitoria && !vitoria) {
            vitoria = true;
        }

        if (vitoria) {
            console.log("Ganhou!");
            jogoIniciado = false;
            document.getElementById('tela-vitoria').style.display = "flex";
            return;
        }

        const dt = lastTimeMs ? (timeMs - lastTimeMs) / 1000 : 0;
        lastTimeMs = timeMs;

        updateGame(dt);
        updateCamera();

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        drawTrack();
        drawObstacles();

        const legSwing = Math.sin(walkCycle) * 15;
        const armSwing = Math.sin(walkCycle) * 10;
        const bodyBounce = Math.abs(Math.sin(walkCycle)) * 0.05;

        const rY = 0.99, gY = 0.96, bY = 0.69;
        const rB = 0.5, gB = 0.14, bB = 0.16;
        const rD = 0.2, gD = 0.1, bD = 0.0;

        drawCube(1.0, rY, gY, bY, 0, bodyBounce, 0, 1.4, 1.1, 1.1);
        
        drawCube(0.6, rB, gB, bB, 0, 0.6 + bodyBounce, 0, 1.3, 0.4, 1.3);
        drawCube(0.2, rB, gB, bB, 0, 0.8 + bodyBounce, 0, 1.0, 1.5, 1.0);

        theta_z = -25;
        drawCube(0.4, rY, gY, bY, -0.8, 0.1 + bodyBounce, 0, 1.2, 2.8, 0.8);
        theta_z = 25;
        drawCube(0.4, rY, gY, bY, 0.8, 0.1 + bodyBounce, 0, 1.2, 2.8, 0.8);
        theta_z = 0;

        drawCube(0.08, rD, gD, bD, -0.3, -0.05 + bodyBounce, 0.56, 1.0, 1.0, 1.0);
        drawCube(0.08, rD, gD, bD, 0.3, -0.05 + bodyBounce, 0.56, 1.0, 1.0, 1.0);

        drawCube(0.08, rD, gD, bD, 0, -0.15 + bodyBounce, 0.56, 1.5, 1.0, 1.0);
        drawCube(0.05, rD, gD, bD, 0, -0.1 + bodyBounce, 0.58, 1.0, 1.0, 1.0);

        drawCube(1.0, rY, gY, bY, 0, -0.9 + bodyBounce, 0, 1.2, 1.0, 0.9);
        
        drawCube(0.2, rY, gY, bY, 0, -1.1 + bodyBounce, -0.5, 1.0, 1.0, 1.0);

        theta_x = armSwing;
        drawCube(0.3, rY, gY, bY, -0.7, -0.8 + bodyBounce, 0.2, 1.0, 1.5, 1.0);
        theta_x = -armSwing;
        drawCube(0.3, rY, gY, bY, 0.7, -0.8 + bodyBounce, 0.2, 1.0, 1.5, 1.0);
        theta_x = 0;
        
        theta_x = legSwing;
        drawCube(0.35, rY, gY, bY, -0.35, -1.4, 0.1, 1.1, 0.8, 1.2);
        theta_x = -legSwing;
        drawCube(0.35, rY, gY, bY, 0.35, -1.4, 0.1, 1.1, 0.8, 1.2);
        theta_x = 0;

        requestAnimationFrame(frame);
    }
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