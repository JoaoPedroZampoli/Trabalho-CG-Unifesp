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
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let modelViewMatrix = [];
    let inverseTransposeModelViewMatrix = [];

    let P0 = [0.0,0.0,2.0];
    let Pref = [0.0,0.0,0.0];
    let V = [0.0,1.0,0.0];
    let viewingMatrix = m4.setViewingMatrix(P0,Pref,V);

    gl.uniform3fv(viewPositionUniformLocation, new Float32Array(P0));
    gl.uniform3fv(lightPositionUniformLocation, new Float32Array([1.0,1.0,1.0]));

    let xw_min = -1.0;
    let xw_max = 1.0;
    let yw_min = -1.0;
    let yw_max = 1.0;
    let z_near = -1.0;
    let z_far = -20.0;

    let projectionMatrix = m4.setPerspectiveProjectionMatrix(xw_min,xw_max,yw_min,yw_max,z_near,z_far);

    // para cubos
    let vertices = [];

    let theta_x = 0; let theta_y = 0; let theta_z = 0;

    // Posição do Pompompurin
    let posX = 0;
    let posY = 0;
    let posZ = 0;
    let rotacao = 0; // Rotação do personagem

    // Animação de caminhada
    let walkCycle = 0;
    let isWalking = false;

    // Controle de teclas pressionadas
    const keys = {};

    document.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
    });

    document.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
    });

    function handleInput() {
        const velocidade = 0.03;
        const velocidadeRotacao = 2;
        isWalking = false;

        // Movimento WASD
        if (keys['w']) {
            posX += Math.sin(degToRad(rotacao)) * velocidade;
            posZ += Math.cos(degToRad(rotacao)) * velocidade;
            isWalking = true;
        }
        if (keys['s']) {
            posX -= Math.sin(degToRad(rotacao)) * velocidade;
            posZ -= Math.cos(degToRad(rotacao)) * velocidade;
            isWalking = true;
        }
        if (keys['a']) {
            rotacao += velocidadeRotacao;
        }
        if (keys['d']) {
            rotacao -= velocidadeRotacao;
        }

        // Animação de caminhada
        if (isWalking) {
            walkCycle += 0.2;
        } else {
            walkCycle = 0;
        }
    }

    function drawCube(tam, r, g, b, add_x, add_y, add_z, sx, sy, sz) {
        vertices = setCubeVertices(tam);

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
        
        // Aplicar rotação e posição global do personagem
        modelViewMatrix = m4.yRotate(modelViewMatrix, degToRad(rotacao));
        modelViewMatrix = m4.translate(modelViewMatrix, posX, posY, posZ);

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

    P0 = [0.0, 0.5, 3.0];
    Pref = [0.0,0.0,0.0];
    V = [0.0,1.0,0.0];
    viewingMatrix = m4.setViewingMatrix(P0,Pref,V);
    
    let angulo = 0;

    function rotaciona_camera() {
        angulo += 0.05;

        const raio = 2.5;
        P0 = [raio * Math.sin(angulo), 0.0, raio * Math.cos(angulo)];

        viewingMatrix = m4.setViewingMatrix(P0, Pref, V);
        gl.uniformMatrix4fv(viewingMatrixUniformLocation, false, viewingMatrix);
    }

    function drawPompompurin() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        handleInput();

        // Animação de balanço ao andar
        const legSwing = Math.sin(walkCycle) * 15;
        const armSwing = Math.sin(walkCycle) * 10;
        const bodyBounce = Math.abs(Math.sin(walkCycle)) * 0.02;

        // Cores
        const rY = 0.99, gY = 0.96, bY = 0.69; // Amarelo
        const rB = 0.5, gB = 0.14, bB = 0.16; // Marrom (Boina)
        const rD = 0.2, gD = 0.1, bD = 0.0; // Escuro (Rosto dele)

        //tam, r, g, b, add_x, add_y, add_z, sx, sy, sz
        // Cabeca (com bounce)
        drawCube(1.0, rY, gY, bY, 0, bodyBounce, 0, 1.2, 1.0, 1.0); 
        // Boina
        drawCube(0.6, rB, gB, bB, 0, 0.55 + bodyBounce, 0, 1.2, 0.4, 1.2);
        drawCube(0.2, rB, gB, bB, 0, 0.7 + bodyBounce, 0, 1.0, 1.5, 1.0);
        // Orelhas
        theta_z = -20;
        drawCube(0.4, rY, gY, bY, -0.7, 0.2 + bodyBounce, 0, 1.0, 2.5, 0.8);
        theta_z = 20;
        drawCube(0.4, rY, gY, bY, 0.7, 0.2 + bodyBounce, 0, 1.0, 2.5, 0.8);
        theta_z = 0;
        // Olhos
        drawCube(0.08, rD, gD, bD, -0.25, -0.05 + bodyBounce, 0.51, 1.0, 1.0, 1.0);
        drawCube(0.08, rD, gD, bD, 0.25, -0.05 + bodyBounce, 0.51, 1.0, 1.0, 1.0);
        // Nariz/Boca
        drawCube(0.08, rD, gD, bD, 0, -0.15 + bodyBounce, 0.51, 1.5, 1.0, 1.0);
        // Corpo
        drawCube(1.0, rY, gY, bY, 0, -0.9 + bodyBounce, 0, 1.1, 0.9, 0.7);
        
        // Bracos (com animação de balanço)
        theta_x = armSwing;
        drawCube(0.3, rY, gY, bY, -0.6, -0.8 + bodyBounce, 0.2, 1.0, 1.5, 1.0);
        theta_x = -armSwing;
        drawCube(0.3, rY, gY, bY, 0.6, -0.8 + bodyBounce, 0.2, 1.0, 1.5, 1.0);
        theta_x = 0;
        
        // Pernas (com animação de caminhada)
        theta_x = legSwing;
        drawCube(0.35, rY, gY, bY, -0.3, -1.4, 0.1, 1.0, 0.8, 1.2);
        theta_x = -legSwing;
        drawCube(0.35, rY, gY, bY, 0.3, -1.4, 0.1, 1.0, 0.8, 1.2);
        theta_x = 0;

        requestAnimationFrame(drawPompompurin);
    }

    drawPompompurin();
}

function crossProduct(v1, v2) {
  let result = [
      v1[1] * v2[2] - v1[2] * v2[1],
      v1[2] * v2[0] - v1[0] * v2[2],
      v1[0] * v2[1] - v1[1] * v2[0]
  ];
  return result;
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