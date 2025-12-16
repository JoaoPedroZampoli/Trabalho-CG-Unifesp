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

const vertexShaderSourceText = `
    attribute vec3 a_position;
    attribute vec3 a_normal;
    attribute vec2 a_texcoord;
    
    varying vec3 v_normal;
    varying vec2 v_texcoord;
    varying vec3 v_surfaceToLight;
    varying vec3 v_surfaceToView;
    
    uniform mat4 u_modelViewMatrix;
    uniform mat4 u_viewingMatrix;
    uniform mat4 u_projectionMatrix;
    uniform mat4 u_inverseTransposeModelViewMatrix;

    uniform vec3 u_lightPosition;
    uniform vec3 u_viewPosition;

    void main() {
        gl_Position = u_projectionMatrix * u_viewingMatrix * u_modelViewMatrix * vec4(a_position,1.0);
        v_normal = normalize(mat3(u_inverseTransposeModelViewMatrix) * a_normal);
        vec3 surfacePosition = (u_modelViewMatrix * vec4(a_position, 1)).xyz;
        v_texcoord = a_texcoord;
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

const fragmentShaderSourceText = `
    precision mediump float;

    varying vec3 v_normal;
    varying vec2 v_texcoord;
    varying vec3 v_surfaceToLight;
    varying vec3 v_surfaceToView;

    uniform sampler2D u_texture;

    void main() {
        // Sample texture only once
        vec4 tex = texture2D(u_texture, v_texcoord);
        vec3 baseColor = tex.rgb;

        // Normalize vectors
        vec3 normal = normalize(v_normal);
        vec3 lightDir = normalize(v_surfaceToLight);
        vec3 viewDir  = normalize(v_surfaceToView);
        vec3 halfVec  = normalize(lightDir + viewDir);

        // Diffuse
        float diffuse = max(dot(lightDir, normal), 0.0);

        // Specular
        float specular = 0.0;
        if (diffuse > 0.0) {
            specular = pow(max(dot(normal, halfVec), 0.0), 250.0);
        }

        // Final color
        vec3 ambient  = 0.5 * baseColor;
        vec3 diffuseC = 0.5 * diffuse * baseColor;
        vec3 specularC = specular * vec3(1.0);

        gl_FragColor = vec4(ambient + diffuseC + specularC, tex.a);
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

function createSphere(latBands = 40, longBands = 40, radius = 1) {
  const positions = [];
  const normals = [];
  const texcoords = [];
  const indices = [];

  for (let lat = 0; lat <= latBands; lat++) {
      const theta = lat * Math.PI / latBands;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      for (let lon = 0; lon <= longBands; lon++) {
          const phi = lon * 2 * Math.PI / longBands;
          const sinPhi = Math.sin(phi);
          const cosPhi = Math.cos(phi);

          const x = cosPhi * sinTheta;
          const y = cosTheta;
          const z = sinPhi * sinTheta;

          positions.push(radius * x, radius * y, radius * z);
          normals.push(x, y, z);
          texcoords.push(lon / longBands, lat / latBands);
      }
  }

  for (let lat = 0; lat < latBands; lat++) {
      for (let lon = 0; lon < longBands; lon++) {
          const a = lat * (longBands + 1) + lon;
          const b = a + longBands + 1;

          indices.push(a, b, a + 1);
          indices.push(b, b + 1, a + 1);
      }
  }

  return { positions, normals, texcoords, indices };
}

function setSuperConicSphereVertices(radius, slices, stacks, s1, s2) {
  const vertexData = [];
  let slicesStep = (2 * Math.PI) / slices;
  let stacksStep = Math.PI / stacks;

  for (let i = 0; i < stacks; i++) {
      let phi = -Math.PI / 2 + i * stacksStep;
      for (let j = 0; j < slices; j++) {
          let theta = -Math.PI + j * slicesStep;
          vertexData.push(...[
              radius * Math.sign(Math.cos(phi)) * Math.pow(Math.abs(Math.cos(phi)), s1) * Math.sign(Math.cos(theta)) * Math.pow(Math.abs(Math.cos(theta)), s2),
              radius * Math.sign(Math.cos(phi)) * Math.pow(Math.abs(Math.cos(phi)), s1) * Math.sign(Math.sin(theta)) * Math.pow(Math.abs(Math.sin(theta)), s2),
              radius * Math.sign(Math.sin(phi)) * Math.pow(Math.abs(Math.sin(phi)), s1)
          ]);
          vertexData.push(...[
              radius * Math.sign(Math.cos(phi + stacksStep)) * Math.pow(Math.abs(Math.cos(phi + stacksStep)), s1) * Math.sign(Math.cos(theta)) * Math.pow(Math.abs(Math.cos(theta)), s2),
              radius * Math.sign(Math.cos(phi + stacksStep)) * Math.pow(Math.abs(Math.cos(phi + stacksStep)), s1) * Math.sign(Math.sin(theta)) * Math.pow(Math.abs(Math.sin(theta)), s2),
              radius * Math.sign(Math.sin(phi + stacksStep)) * Math.pow(Math.abs(Math.sin(phi + stacksStep)), s1)
          ]);
          vertexData.push(...[
              radius * Math.sign(Math.cos(phi)) * Math.pow(Math.abs(Math.cos(phi)), s1) * Math.sign(Math.cos(theta + slicesStep)) * Math.pow(Math.abs(Math.cos(theta + slicesStep)), s2),
              radius * Math.sign(Math.cos(phi)) * Math.pow(Math.abs(Math.cos(phi)), s1) * Math.sign(Math.sin(theta + slicesStep)) * Math.pow(Math.abs(Math.sin(theta + slicesStep)), s2),
              radius * Math.sign(Math.sin(phi)) * Math.pow(Math.abs(Math.sin(phi)), s1)
          ]);
          vertexData.push(...[
              radius * Math.sign(Math.cos(phi + stacksStep)) * Math.pow(Math.abs(Math.cos(phi + stacksStep)), s1) * Math.sign(Math.cos(theta)) * Math.pow(Math.abs(Math.cos(theta)), s2),
              radius * Math.sign(Math.cos(phi + stacksStep)) * Math.pow(Math.abs(Math.cos(phi + stacksStep)), s1) * Math.sign(Math.sin(theta)) * Math.pow(Math.abs(Math.sin(theta)), s2),
              radius * Math.sign(Math.sin(phi + stacksStep)) * Math.pow(Math.abs(Math.sin(phi + stacksStep)), s1)
          ]);
          vertexData.push(...[
              radius * Math.sign(Math.cos(phi + stacksStep)) * Math.pow(Math.abs(Math.cos(phi + stacksStep)), s1) * Math.sign(Math.cos(theta + slicesStep)) * Math.pow(Math.abs(Math.cos(theta + slicesStep)), s2),
              radius * Math.sign(Math.cos(phi + stacksStep)) * Math.pow(Math.abs(Math.cos(phi + stacksStep)), s1) * Math.sign(Math.sin(theta + slicesStep)) * Math.pow(Math.abs(Math.sin(theta + slicesStep)), s2),
              radius * Math.sign(Math.sin(phi + stacksStep)) * Math.pow(Math.abs(Math.sin(phi + stacksStep)), s1)
          ]);
          vertexData.push(...[
              radius * Math.sign(Math.cos(phi)) * Math.pow(Math.abs(Math.cos(phi)), s1) * Math.sign(Math.cos(theta + slicesStep)) * Math.pow(Math.abs(Math.cos(theta + slicesStep)), s2),
              radius * Math.sign(Math.cos(phi)) * Math.pow(Math.abs(Math.cos(phi)), s1) * Math.sign(Math.sin(theta + slicesStep)) * Math.pow(Math.abs(Math.sin(theta + slicesStep)), s2),
              radius * Math.sign(Math.sin(phi)) * Math.pow(Math.abs(Math.sin(phi)), s1)
          ]);
      }
  }

  return new Float32Array(vertexData);
}

function setSuperConicSphereNormals_flat(radius, slices, stacks, s1, s2) {
  const normalData = [];
  let slicesStep = (2 * Math.PI) / slices;
  let stacksStep = Math.PI / stacks;

  let theta = -Math.PI;
  let phi = -Math.PI / 2;

  for (let i = 0; i < stacks; i++) {
      let phi = -Math.PI / 2 + i * stacksStep;
      for (let j = 0; j < slices; j++) {
          let theta = -Math.PI + j * slicesStep;
          P0 = [
              radius * Math.sign(Math.cos(phi)) * Math.pow(Math.abs(Math.cos(phi)), s1) * Math.sign(Math.cos(theta)) * Math.pow(Math.abs(Math.cos(theta)), s2),
              radius * Math.sign(Math.cos(phi)) * Math.pow(Math.abs(Math.cos(phi)), s1) * Math.sign(Math.sin(theta)) * Math.pow(Math.abs(Math.sin(theta)), s2),
              radius * Math.sign(Math.sin(phi)) * Math.pow(Math.abs(Math.sin(phi)), s1)
          ];
          P1 = [
              radius * Math.sign(Math.cos(phi + stacksStep)) * Math.pow(Math.abs(Math.cos(phi + stacksStep)), s1) * Math.sign(Math.cos(theta)) * Math.pow(Math.abs(Math.cos(theta)), s2),
              radius * Math.sign(Math.cos(phi + stacksStep)) * Math.pow(Math.abs(Math.cos(phi + stacksStep)), s1) * Math.sign(Math.sin(theta)) * Math.pow(Math.abs(Math.sin(theta)), s2),
              radius * Math.sign(Math.sin(phi + stacksStep)) * Math.pow(Math.abs(Math.sin(phi + stacksStep)), s1)
          ];
          P2 = [
              radius * Math.sign(Math.cos(phi)) * Math.pow(Math.abs(Math.cos(phi)), s1) * Math.sign(Math.cos(theta + slicesStep)) * Math.pow(Math.abs(Math.cos(theta + slicesStep)), s2),
              radius * Math.sign(Math.cos(phi)) * Math.pow(Math.abs(Math.cos(phi)), s1) * Math.sign(Math.sin(theta + slicesStep)) * Math.pow(Math.abs(Math.sin(theta + slicesStep)), s2),
              radius * Math.sign(Math.sin(phi)) * Math.pow(Math.abs(Math.sin(phi)), s1)
          ];
          N = crossProduct([P2[0] - P0[0], P2[1] - P0[1], P2[2] - P0[2]], [P1[0] - P0[0], P1[1] - P0[1], P1[2] - P0[2]]);
          normalData.push(...N);
          normalData.push(...N);
          normalData.push(...N);

          P0 = [
              radius * Math.sign(Math.cos(phi + stacksStep)) * Math.pow(Math.abs(Math.cos(phi + stacksStep)), s1) * Math.sign(Math.cos(theta)) * Math.pow(Math.abs(Math.cos(theta)), s2),
              radius * Math.sign(Math.cos(phi + stacksStep)) * Math.pow(Math.abs(Math.cos(phi + stacksStep)), s1) * Math.sign(Math.sin(theta)) * Math.pow(Math.abs(Math.sin(theta)), s2),
              radius * Math.sign(Math.sin(phi + stacksStep)) * Math.pow(Math.abs(Math.sin(phi + stacksStep)), s1)
          ];
          P1 = [
              radius * Math.sign(Math.cos(phi + stacksStep)) * Math.pow(Math.abs(Math.cos(phi + stacksStep)), s1) * Math.sign(Math.cos(theta + slicesStep)) * Math.pow(Math.abs(Math.cos(theta + slicesStep)), s2),
              radius * Math.sign(Math.cos(phi + stacksStep)) * Math.pow(Math.abs(Math.cos(phi + stacksStep)), s1) * Math.sign(Math.sin(theta + slicesStep)) * Math.pow(Math.abs(Math.sin(theta + slicesStep)), s2),
              radius * Math.sign(Math.sin(phi + stacksStep)) * Math.pow(Math.abs(Math.sin(phi + stacksStep)), s1)
          ];
          P2 = [
              radius * Math.sign(Math.cos(phi)) * Math.pow(Math.abs(Math.cos(phi)), s1) * Math.sign(Math.cos(theta + slicesStep)) * Math.pow(Math.abs(Math.cos(theta + slicesStep)), s2),
              radius * Math.sign(Math.cos(phi)) * Math.pow(Math.abs(Math.cos(phi)), s1) * Math.sign(Math.sin(theta + slicesStep)) * Math.pow(Math.abs(Math.sin(theta + slicesStep)), s2),
              radius * Math.sign(Math.sin(phi)) * Math.pow(Math.abs(Math.sin(phi)), s1)
          ];
          N = crossProduct([P2[0] - P0[0], P2[1] - P0[1], P2[2] - P0[2]], [P1[0] - P0[0], P1[1] - P0[1], P1[2] - P0[2]]);
          normalData.push(...N);
          normalData.push(...N);
          normalData.push(...N);
      }
  }

  return new Float32Array(normalData);
}

function main() {
    const canvas = document.getElementById('glCanvas');
    const gl = canvas.getContext('webgl');

    if (!gl) {
        console.error('WebGL not supported');
        return;
    }

    // Cores:
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = createProgram(gl, vertexShader, fragmentShader);

    // Texturas:
    const vertexShaderText = createShader(gl, gl.VERTEX_SHADER, vertexShaderSourceText);
    const fragmentShaderText = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSourceText);
    const programText = createProgram(gl, vertexShaderText, fragmentShaderText);

    // Cubos:
    const VertexBuffer = gl.createBuffer();
    const NormalBuffer = gl.createBuffer();

    // Esfera:
    const VertexBufferSphere = gl.createBuffer();
    const NormalBufferSphere = gl.createBuffer();
    const texcoordBuffer = gl.createBuffer();
    const IndexBuffer = gl.createBuffer();

    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(135/255, 206/255, 235/255, 1.0); // Azul ceu
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let modelViewMatrix = [];
    let inverseTransposeModelViewMatrix = [];


    // Camera Perspectiva:
    let xw_min = -2.048;
    let xw_max = 2.048;
    let yw_min = -1.0;
    let yw_max = 1.0;
    let z_near = -1.0;
    let z_far = -60.0;
    let projectionMatrix = m4.setPerspectiveProjectionMatrix(xw_min,xw_max,yw_min,yw_max,z_near,z_far);

    // para cubos
    let vertices = [];
    let theta_x = 0; let theta_y = 0; let theta_z = 0;
    function drawCube(tam, r, g, b, add_x, add_y, add_z, sx, sy, sz) {
        gl.useProgram(program);

        const positionLocation = gl.getAttribLocation(program, 'a_position');
        const normalLocation = gl.getAttribLocation(program, 'a_normal');
        
        const colorUniformLocation = gl.getUniformLocation(program, 'u_color');

        const modelViewMatrixUniformLocation = gl.getUniformLocation(program,'u_modelViewMatrix');
        const viewingMatrixUniformLocation = gl.getUniformLocation(program,'u_viewingMatrix');
        const projectionMatrixUniformLocation = gl.getUniformLocation(program,'u_projectionMatrix');
        const inverseTransposeModelViewMatrixUniformLocation = gl.getUniformLocation(program, `u_inverseTransposeModelViewMatrix`);

        const lightPositionUniformLocation = gl.getUniformLocation(program,'u_lightPosition');
        const viewPositionUniformLocation = gl.getUniformLocation(program,'u_viewPosition');

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
        modelViewMatrix = m4.translate(modelViewMatrix, add_x, add_y, -add_z);

        inverseTransposeModelViewMatrix = m4.transpose(m4.inverse(modelViewMatrix));
        
        gl.uniformMatrix4fv(modelViewMatrixUniformLocation,false,modelViewMatrix);
        gl.uniformMatrix4fv(inverseTransposeModelViewMatrixUniformLocation,false,inverseTransposeModelViewMatrix);
        gl.uniformMatrix4fv(viewingMatrixUniformLocation,false,viewingMatrix);
        gl.uniformMatrix4fv(projectionMatrixUniformLocation,false,projectionMatrix);
        
        gl.uniform3fv(colorUniformLocation, new Float32Array([r,g,b]));
        gl.uniform3fv(viewPositionUniformLocation, new Float32Array(P0));
        gl.uniform3fv(lightPositionUniformLocation, new Float32Array([2.0,2.0,posZ + 3.0]));

        gl.drawArrays(gl.TRIANGLES, 0, 6*6);
    }

    P0 = [0.0,2.5,3.5];
    Pref = [0.0,0.0,-10.0];
    V = [0.0,1.0,0.0];
    viewingMatrix = m4.setViewingMatrix(P0,Pref,V);

    // Orelhas:
    let velocidadeOrelhas = 0.01;
    let corridaOrelhas = 0;
    let limite_x = 0.2;

    // Pernas:
    let andada = 0;
    let velAndada = 0.15;

    // Interação:
    let posX = 0;     // posição horizontal do personagem
    let posY = 0;     // posição vertical (para pular)
    let posZ = 0;     // posicao em Z
    let velZ = 0.30;  // velocidade para andar
    let velY = 0;     // velocidade vertical (pulo)
    let gravity = -0.02; // gravidade
    let jumpPower = 0.3; // força do pulo
    let isJumping = false; 

    let gameOver = false;
    let jogoIniciado = false;

    let distPercorrida = 0;
    let distVitoria = 300;
    let vitoria = false;

    let obstacles = [];

    function checkCollision() {
        obstacles.forEach(o => {
            let dx = Math.abs(posX - o.x);
            let dz = Math.abs(posZ - o.z);

            if (dx < 0.8 && dz < 0.8 && posY < 0.5) {
                gameOver = true;
            }
        });
    }

    function spawnObstacle() {
        const lanes = [-2, 0, 2];
        const types = ["brigadeiro", "morango", "bombom", "melao"];

        obstacles.push({
            type: types[Math.floor(Math.random() * types.length)],
            x: lanes[Math.floor(Math.random() * lanes.length)],
            z: posZ - 30,
            raio: 0.6
        });
    }

    function cleanObstacles() {
        obstacles = obstacles.filter(o => o.z < posZ + 5);
    }

    function drawObstacles() {
        obstacles.forEach(o => {
            if (o.type === "brigadeiro")
                drawBrigadeiro(o.x, o.z);
            else if (o.type === "morango")
                drawBrigadeiroMorango(o.x, o.z);
            else if(o.type === "bombom")
                drawBombomChocolate(o.x, o.z);
            else 
                drawSorveteMelao(o.x, o.z);
        });
    }

    let partesPista = [];
    const pistaTamanho = 30;
    const pistaLargura = 2;

    for (let i = 0; i < 10; i++) {
        spawnPartePista(-i * pistaTamanho);
    }

    function spawnPartePista(z) {
        partesPista.push({
            z: z
        });
    }

    function atualizaPista() {
        // remove pista que ficou para trás
        if (partesPista.length > 0) {
            let first = partesPista[0];
            if (first.z > posZ + pistaTamanho) {
                partesPista.shift();

                let lastZ = partesPista[partesPista.length - 1].z;
                spawnPartePista(lastZ - pistaTamanho);
            }
        }
    }

    // Pista:
    const lanes = [-2, 0, 2]; // esquerda, centro, direita
    let currentLane = 1; // começa na pista do meio

    const bodyElement = document.querySelector("body");
    bodyElement.addEventListener("keydown",keyDown,false);

    function keyDown(event){
        switch(event.key){
            case 'ArrowRight':
                if(currentLane < 2) { // só pode ir para a direita se não estiver na última pista
                    currentLane++;
                }
                break;
            case 'ArrowLeft':
                if(currentLane > 0) { // só pode ir para a esquerda se não estiver na primeira pista
                    currentLane--;
                }
                break;
            case 'ArrowUp':
                if(!isJumping){      // só pula se não estiver no ar
                    velY = jumpPower;
                    isJumping = true;
                }
                break;
        }
        // Atualiza posX com base na pista atual
        posX = lanes[currentLane];
    }

    // --- CONFIGURAÇÃO DO BOTÃO (Fica fora do drawScene) ---
    // O Javascript fica "ouvindo" o clique desde o começo, 
    // mas o botão está escondido, então o usuário não clica sem querer.
    const btnProxima = document.getElementById('botao-prox-fase');
    
    if (btnProxima) { // Verifica se o botão existe para não dar erro
        btnProxima.addEventListener("click", () => {
        // Aqui fazemos o redirecionamento mantendo o mesmo arquivo HTML
        // mas avisando que agora é a fase 3
            window.location.href = "index.html?fase=3";
        });
    }

    function drawPochacco() {

        posZ -= velZ; // personagem andando
        distPercorrida = Math.abs(posZ);

        if(corridaOrelhas > limite_x) {
            velocidadeOrelhas = -velocidadeOrelhas;
        } else if (corridaOrelhas < 0 ) {
            velocidadeOrelhas = -velocidadeOrelhas;
        }
        corridaOrelhas += velocidadeOrelhas;

        andada += velAndada;

        // Movimento da orelha (e cabelos) (abre e fecha)
        let movimentoOrelha = Math.sin(corridaOrelhas * 4) * 20;
        let movimentoBraco = Math.sin(andada * 2.5) * 20;
        let movimentoPerna = Math.sin(andada * 2.5 + Math.PI) * 20;

        // Atualiza posição vertical com física
        posY += velY;
        velY += gravity;

        // Evita que caia abaixo do chão
        if(posY <= 0){
            posY = 0;
            velY = 0;
            isJumping = false;  // personagem voltou ao chão
        }

        let offsetX = posX;
        let offsetY = posY;

        //tam, r, g, b, add_x, add_y, add_z, sx, sy, sz
        // Cabeca:
        drawCube(0.8, 1.0, 1.0, 1.0, 0 + offsetX, 0 + offsetY, 0 - posZ, 1, 1, 1);
        // Bigode:
        drawCube(0.8, 1.0, 1.0, 1.0, 0 + offsetX, -0.25 + offsetY, 0.05 - posZ, 1, 0.35, 1); 
        // Olho Esquerdo:
        drawCube(0.05, 0.0, 0.0, 0.0, -0.2 + offsetX, -0.02 + offsetY, 0.4 - posZ, 1.8, 3, 1); 
        // Olho Direito:
        drawCube(0.05, 0.0, 0.0, 0.0, 0.2 + offsetX, -0.02 + offsetY, 0.4 - posZ, 1.8, 3, 1); 
        // Fucinho:
        drawCube(0.05, 0.0, 0.0, 0.0, 0 + offsetX, -0.1 + offsetY, 0.45 - posZ, 2.5, 1.5, 1); 
        // Orelha Direita:
        theta_z = movimentoOrelha;
        drawCube(0.2, 0.0, 0.0, 0.0, 0.45 + offsetX, 0.12 + offsetY, 0.0 - posZ, 0.7, 2.5, 1); 
        // Orelha Esquerda:
        theta_z = - movimentoOrelha;
        drawCube(0.2, 0.0, 0.0, 0.0, -0.45 + offsetX, 0.12 + offsetY, 0.0 - posZ, 0.7, 2.5, 1); 
        theta_z = 0;
        // Corpo pelo branco:
        drawCube(0.8, 1.0, 1.0, 1.0, 0 + offsetX, -0.7 + offsetY, 0 - posZ, 1, 0.7, 1); 
        // Camiseta vermelha:
        drawCube(0.85, 1.0, 0.0, 0.0, 0 + offsetX, -0.6 + offsetY, 0 - posZ, 1, 0.5, 1); 

        // Braco direito:
        theta_z = 20; theta_x = movimentoBraco;
        drawCube(0.2, 1.0, 1.0, 1.0, 0.48 + offsetX, -0.6 + offsetY, 0.0 - posZ, 1, 2, 1); 
        // Manga da camiseta direita:
        drawCube(0.23, 1.0, 0.0, 0.0, 0.48 + offsetX, -0.5 + offsetY, 0.0 - posZ, 1, 1, 1.2); 
        // Braco esquerdo:
        theta_z = -20; theta_x = - movimentoBraco;
        drawCube(0.2, 1.0, 1.0, 1.0, -0.48 + offsetX, -0.6 + offsetY, 0.0 - posZ, 1, 2, 1); 
        // Manga da camiseta esquerda:
        drawCube(0.23, 1.0, 0.0, 0.0, -0.48 + offsetX, -0.5 + offsetY, 0.0 - posZ, 1, 1, 1.2); 
        theta_z = 0;

        // Perna direita:
        theta_x = movimentoPerna;
        drawCube(0.5, 1.0, 1.0, 1.0, 0.2 + offsetX, -1.0 + offsetY, 0 - posZ, 0.7, 1, 0.8); // perna direita
        // Perna esquerda:
        theta_x = -movimentoPerna;
        drawCube(0.5, 1.0, 1.0, 1.0, -0.2 + offsetX, -1.0 + offsetY, 0 - posZ, 0.7, 1, 0.8); // perna esquerda
        // Cabelo esquerdo:
        theta_z = 20 + movimentoOrelha; theta_x = 0;
        drawCube(0.1, 0.0, 0.0, 0.0, -0.2 + offsetX, 0.5 + offsetY, 0 - posZ, 1, 2.5, 1); // cabelo esquerdo
        // Cabelo direito:
        theta_z = -20 - movimentoOrelha;
        drawCube(0.1, 0.0, 0.0, 0.0, 0.2 + offsetX, 0.5 + offsetY, 0 - posZ, 1, 2.5, 1); // cabelo direito
        // Cabelo do meio:
        theta_z = movimentoOrelha;
        drawCube(0.1, 0.0, 0.0, 0.0, 0.0 + offsetX, 0.55 + offsetY, 0 - posZ, 1, 3, 1); // cabelo do meio
        theta_z = 0;

        // Atualiza câmera com base na posição atual do personagem:
        P0 = [posX,2.5 + posY,3.5 + posZ];
        Pref = [posX,0.0 + posY,-10.0 + posZ];
        V = [0.0,1.0,0.0];
        viewingMatrix = m4.setViewingMatrix(P0,Pref,V);
    }

    // Textura para brigadeiro
    const textureBrig = gl.createTexture();
    const imageBrig = new Image();
    imageBrig.src = "Pista-Pochacco/brigadeiro.jpg";
    imageBrig.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, textureBrig);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imageBrig);

        // Allow non-power-of-two textures correctly (NO MIPMAPS)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textureBrig);
        const texLocation = gl.getUniformLocation(programText, "u_texture");

        gl.uniform1i(texLocation, 0); // use TEXTURE0

        drawScene();
    };

    function drawBrigadeiro(posicaoX, posicaoZ){
        gl.useProgram(programText);

        const positionLocation = gl.getAttribLocation(programText, 'a_position');
        const normalLocation = gl.getAttribLocation(programText, 'a_normal');
        const texcoordLocation = gl.getAttribLocation(programText, "a_texcoord");
        
        modelViewMatrix = m4.identity();
        modelViewMatrix = m4.translate(modelViewMatrix, posicaoX, -0.7, posicaoZ);

        inverseTransposeModelViewMatrix = m4.transpose(m4.inverse(modelViewMatrix));

        const modelViewMatrixUniformLocation = gl.getUniformLocation(programText,'u_modelViewMatrix');
        const viewingMatrixUniformLocation = gl.getUniformLocation(programText,'u_viewingMatrix');
        const projectionMatrixUniformLocation = gl.getUniformLocation(programText,'u_projectionMatrix');
        const inverseTransposeModelViewMatrixUniformLocation = gl.getUniformLocation(programText, `u_inverseTransposeModelViewMatrix`);

        const lightPositionUniformLocation = gl.getUniformLocation(programText,'u_lightPosition');
        const viewPositionUniformLocation = gl.getUniformLocation(programText,'u_viewPosition');        

        gl.uniformMatrix4fv(modelViewMatrixUniformLocation,false,modelViewMatrix);
        gl.uniformMatrix4fv(inverseTransposeModelViewMatrixUniformLocation,false,inverseTransposeModelViewMatrix);
        gl.uniformMatrix4fv(viewingMatrixUniformLocation,false,viewingMatrix);
        gl.uniformMatrix4fv(projectionMatrixUniformLocation,false,projectionMatrix);

        let sphereData = null; let sphereVertices = []; let sphereNormals = []; let sphereTexcoords = []; let sphereIndices = [];
        let n = 30; let radius = 0.6;
        sphereData = createSphere(n, n, radius);
        sphereVertices = new Float32Array(sphereData.positions);
        sphereNormals = new Float32Array(sphereData.normals);
        sphereIndices = new Uint16Array(sphereData.indices);
        sphereTexcoords = new Float32Array(sphereData.texcoords);

        gl.enableVertexAttribArray(positionLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, VertexBufferSphere);
        gl.bufferData(gl.ARRAY_BUFFER, sphereVertices, gl.STATIC_DRAW);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

        gl.enableVertexAttribArray(normalLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, NormalBufferSphere);
        gl.bufferData(gl.ARRAY_BUFFER, sphereNormals, gl.STATIC_DRAW);
        gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);

        gl.enableVertexAttribArray(texcoordLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, sphereTexcoords, gl.STATIC_DRAW);
        gl.vertexAttribPointer(texcoordLocation, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, IndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphereIndices, gl.STATIC_DRAW);

        gl.uniform3fv(viewPositionUniformLocation, new Float32Array(P0));
        gl.uniform3fv(lightPositionUniformLocation, new Float32Array([1.0,1.0,1.0]));

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textureBrig);
        gl.uniform1i(gl.getUniformLocation(programText, "u_texture"), 0);
        
        gl.drawElements(gl.TRIANGLES, sphereIndices.length, gl.UNSIGNED_SHORT, 0);
    }

    // Textura para brigadeiro de morango
    const textureBrigMorango = gl.createTexture();
    const imageBrigMorango = new Image();
    imageBrigMorango.src = "Pista-Pochacco/brigadeiro-morango.jpg";
    imageBrigMorango.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, textureBrigMorango);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imageBrigMorango);

        // Allow non-power-of-two textures correctly (NO MIPMAPS)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textureBrigMorango);
        const texLocation = gl.getUniformLocation(programText, "u_texture");

        gl.uniform1i(texLocation, 0); // use TEXTURE0

        drawScene();
    };

    function drawBrigadeiroMorango(posicaoX, posicaoZ){
        gl.useProgram(programText);

        const positionLocation = gl.getAttribLocation(programText, 'a_position');
        const normalLocation = gl.getAttribLocation(programText, 'a_normal');
        const texcoordLocation = gl.getAttribLocation(programText, "a_texcoord");
        
        modelViewMatrix = m4.identity();
        modelViewMatrix = m4.translate(modelViewMatrix, posicaoX, -0.7, posicaoZ);

        inverseTransposeModelViewMatrix = m4.transpose(m4.inverse(modelViewMatrix));

        const modelViewMatrixUniformLocation = gl.getUniformLocation(programText,'u_modelViewMatrix');
        const viewingMatrixUniformLocation = gl.getUniformLocation(programText,'u_viewingMatrix');
        const projectionMatrixUniformLocation = gl.getUniformLocation(programText,'u_projectionMatrix');
        const inverseTransposeModelViewMatrixUniformLocation = gl.getUniformLocation(programText, `u_inverseTransposeModelViewMatrix`);

        const lightPositionUniformLocation = gl.getUniformLocation(programText,'u_lightPosition');
        const viewPositionUniformLocation = gl.getUniformLocation(programText,'u_viewPosition');

        gl.uniformMatrix4fv(modelViewMatrixUniformLocation,false,modelViewMatrix);
        gl.uniformMatrix4fv(inverseTransposeModelViewMatrixUniformLocation,false,inverseTransposeModelViewMatrix);
        gl.uniformMatrix4fv(viewingMatrixUniformLocation,false,viewingMatrix);
        gl.uniformMatrix4fv(projectionMatrixUniformLocation,false,projectionMatrix);

        let sphereData = null; let sphereVertices = []; let sphereNormals = []; let sphereTexcoords = []; let sphereIndices = [];
        let n = 30; let radius = 0.6;
        sphereData = createSphere(n, n, radius);
        sphereVertices = new Float32Array(sphereData.positions);
        sphereNormals = new Float32Array(sphereData.normals);
        sphereIndices = new Uint16Array(sphereData.indices);
        sphereTexcoords = new Float32Array(sphereData.texcoords);

        gl.enableVertexAttribArray(positionLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, VertexBufferSphere);
        gl.bufferData(gl.ARRAY_BUFFER, sphereVertices, gl.STATIC_DRAW);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

        gl.enableVertexAttribArray(normalLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, NormalBufferSphere);
        gl.bufferData(gl.ARRAY_BUFFER, sphereNormals, gl.STATIC_DRAW);
        gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);

        gl.enableVertexAttribArray(texcoordLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, sphereTexcoords, gl.STATIC_DRAW);
        gl.vertexAttribPointer(texcoordLocation, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, IndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphereIndices, gl.STATIC_DRAW);

        gl.uniform3fv(viewPositionUniformLocation, new Float32Array(P0));
        gl.uniform3fv(lightPositionUniformLocation, new Float32Array([1.0,1.0,1.0]));

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textureBrigMorango);
        gl.uniform1i(gl.getUniformLocation(programText, "u_texture"), 0);
        
        gl.drawElements(gl.TRIANGLES, sphereIndices.length, gl.UNSIGNED_SHORT, 0);
    }

    // Textura para sorvete de melão
    const textureSorveteMelao = gl.createTexture();
    const imageSorveteMelao = new Image();
    imageSorveteMelao.src = "Pista-Pochacco/sorvete-melao.avif";
    imageSorveteMelao.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, textureSorveteMelao);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imageSorveteMelao);

        // Allow non-power-of-two textures correctly (NO MIPMAPS)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textureSorveteMelao);
        const texLocation = gl.getUniformLocation(programText, "u_texture");

        gl.uniform1i(texLocation, 0); // use TEXTURE0

        drawScene();
    };

    function drawSorveteMelao(posicaoX, posicaoZ){
        gl.useProgram(programText);

        const positionLocation = gl.getAttribLocation(programText, 'a_position');
        const normalLocation = gl.getAttribLocation(programText, 'a_normal');
        const texcoordLocation = gl.getAttribLocation(programText, "a_texcoord");
        
        modelViewMatrix = m4.identity();
        modelViewMatrix = m4.translate(modelViewMatrix, posicaoX, -0.7, posicaoZ);

        inverseTransposeModelViewMatrix = m4.transpose(m4.inverse(modelViewMatrix));

        const modelViewMatrixUniformLocation = gl.getUniformLocation(programText,'u_modelViewMatrix');
        const viewingMatrixUniformLocation = gl.getUniformLocation(programText,'u_viewingMatrix');
        const projectionMatrixUniformLocation = gl.getUniformLocation(programText,'u_projectionMatrix');
        const inverseTransposeModelViewMatrixUniformLocation = gl.getUniformLocation(programText, `u_inverseTransposeModelViewMatrix`);

        const lightPositionUniformLocation = gl.getUniformLocation(programText,'u_lightPosition');
        const viewPositionUniformLocation = gl.getUniformLocation(programText,'u_viewPosition');

        gl.uniformMatrix4fv(modelViewMatrixUniformLocation,false,modelViewMatrix);
        gl.uniformMatrix4fv(inverseTransposeModelViewMatrixUniformLocation,false,inverseTransposeModelViewMatrix);
        gl.uniformMatrix4fv(viewingMatrixUniformLocation,false,viewingMatrix);
        gl.uniformMatrix4fv(projectionMatrixUniformLocation,false,projectionMatrix);

        let sphereData = null; let sphereVertices = []; let sphereNormals = []; let sphereTexcoords = []; let sphereIndices = [];
        let n = 30; let radius = 0.6;
        sphereData = createSphere(n, n, radius);
        sphereVertices = new Float32Array(sphereData.positions);
        sphereNormals = new Float32Array(sphereData.normals);
        sphereIndices = new Uint16Array(sphereData.indices);
        sphereTexcoords = new Float32Array(sphereData.texcoords);

        gl.enableVertexAttribArray(positionLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, VertexBufferSphere);
        gl.bufferData(gl.ARRAY_BUFFER, sphereVertices, gl.STATIC_DRAW);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

        gl.enableVertexAttribArray(normalLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, NormalBufferSphere);
        gl.bufferData(gl.ARRAY_BUFFER, sphereNormals, gl.STATIC_DRAW);
        gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);

        gl.enableVertexAttribArray(texcoordLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, sphereTexcoords, gl.STATIC_DRAW);
        gl.vertexAttribPointer(texcoordLocation, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, IndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphereIndices, gl.STATIC_DRAW);

        gl.uniform3fv(viewPositionUniformLocation, new Float32Array(P0));
        gl.uniform3fv(lightPositionUniformLocation, new Float32Array([1.0,1.0,1.0]));

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textureSorveteMelao);
        gl.uniform1i(gl.getUniformLocation(programText, "u_texture"), 0);
        
        gl.drawElements(gl.TRIANGLES, sphereIndices.length, gl.UNSIGNED_SHORT, 0);
    }

    function drawBombomChocolate(posicaoX, posicaoZ){
        gl.useProgram(program);

        const positionLocation = gl.getAttribLocation(program, 'a_position');
        const normalLocation = gl.getAttribLocation(program, 'a_normal');
        
        const colorUniformLocation = gl.getUniformLocation(program, 'u_color');

        const modelViewMatrixUniformLocation = gl.getUniformLocation(program,'u_modelViewMatrix');
        const viewingMatrixUniformLocation = gl.getUniformLocation(program,'u_viewingMatrix');
        const projectionMatrixUniformLocation = gl.getUniformLocation(program,'u_projectionMatrix');
        const inverseTransposeModelViewMatrixUniformLocation = gl.getUniformLocation(program, `u_inverseTransposeModelViewMatrix`);

        const lightPositionUniformLocation = gl.getUniformLocation(program,'u_lightPosition');
        const viewPositionUniformLocation = gl.getUniformLocation(program,'u_viewPosition');

        const conicVertices = setSuperConicSphereVertices(0.5, 20, 20, 1.5, 2.5);
        const conicNormals = setSuperConicSphereNormals_flat(0.5, 20, 20, 1.5, 2.5);

        gl.enableVertexAttribArray(positionLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, VertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, conicVertices, gl.STATIC_DRAW);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

        gl.enableVertexAttribArray(normalLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, NormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, conicNormals, gl.STATIC_DRAW);
        gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);
        
        modelViewMatrix = m4.identity();
        modelViewMatrix = m4.xRotate(modelViewMatrix,degToRad(90));
        modelViewMatrix = m4.translate(modelViewMatrix, posicaoX, -0.8, posicaoZ);

        inverseTransposeModelViewMatrix = m4.transpose(m4.inverse(modelViewMatrix));

        gl.uniformMatrix4fv(modelViewMatrixUniformLocation,false,modelViewMatrix);
        gl.uniformMatrix4fv(inverseTransposeModelViewMatrixUniformLocation,false,inverseTransposeModelViewMatrix);
        gl.uniformMatrix4fv(viewingMatrixUniformLocation,false,viewingMatrix);
        gl.uniformMatrix4fv(projectionMatrixUniformLocation,false,projectionMatrix);

        gl.uniform3fv(colorUniformLocation, new Float32Array([137/255,81/255,41/255]));
        gl.uniform3fv(viewPositionUniformLocation, new Float32Array(P0));
        gl.uniform3fv(lightPositionUniformLocation, new Float32Array([0.0,-0.5,-8]));

        gl.drawArrays(gl.TRIANGLES, 0, conicVertices.length / 3);
    }

    // Textura para chao
    const textureChao = gl.createTexture();
    const imageChao = new Image();
    imageChao.src = "Pista-Pochacco/chao-rosa.webp";
    imageChao.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, textureChao);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imageChao);

        // Allow non-power-of-two textures correctly (NO MIPMAPS)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textureChao);
        const texLocation = gl.getUniformLocation(programText, "u_texture");

        gl.uniform1i(texLocation, 0); // use TEXTURE0

        drawScene();
    };

    function drawChaoTextura(tam, add_x, add_y, add_z, sx, sy, sz){
        gl.useProgram(programText);

        const positionLocation = gl.getAttribLocation(programText, 'a_position');
        const normalLocation = gl.getAttribLocation(programText, 'a_normal');
        const texcoordLocation = gl.getAttribLocation(programText, "a_texcoord");
        
        modelViewMatrix = m4.identity();
        modelViewMatrix = m4.scale(modelViewMatrix, sx, sy, sz);
        modelViewMatrix = m4.translate(modelViewMatrix, add_x, add_y, add_z);

        inverseTransposeModelViewMatrix = m4.transpose(m4.inverse(modelViewMatrix));

        const modelViewMatrixUniformLocation = gl.getUniformLocation(programText,'u_modelViewMatrix');
        const viewingMatrixUniformLocation = gl.getUniformLocation(programText,'u_viewingMatrix');
        const projectionMatrixUniformLocation = gl.getUniformLocation(programText,'u_projectionMatrix');
        const inverseTransposeModelViewMatrixUniformLocation = gl.getUniformLocation(programText, `u_inverseTransposeModelViewMatrix`);

        const lightPositionUniformLocation = gl.getUniformLocation(programText,'u_lightPosition');
        const viewPositionUniformLocation = gl.getUniformLocation(programText,'u_viewPosition');

        gl.uniformMatrix4fv(modelViewMatrixUniformLocation,false,modelViewMatrix);
        gl.uniformMatrix4fv(inverseTransposeModelViewMatrixUniformLocation,false,inverseTransposeModelViewMatrix);
        gl.uniformMatrix4fv(viewingMatrixUniformLocation,false,viewingMatrix);
        gl.uniformMatrix4fv(projectionMatrixUniformLocation,false,projectionMatrix);

        const vertices = setCubeVertices(tam);
        const normals = setCubeNormals();
        const texcoords = new Float32Array([
            1,1, 1,0, 0,1, 0,1, 1,0, 0,0, // frente
            0,1, 0,0, 1,1, 1,1, 0,0, 1,0, // esquerda
            0,1, 0,0, 1,1, 1,1, 0,0, 1,0, // costas
            1,1, 1,0, 0,1, 0,1, 1,0, 0,0, // direita
            1,1, 1,0, 0,1, 0,1, 1,0, 0,0, // topo
            1,1, 1,0, 0,1, 0,1, 1,0, 0,0  // fundo
        ]);

        gl.enableVertexAttribArray(positionLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, VertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

        gl.enableVertexAttribArray(normalLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, NormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
        gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);

        gl.enableVertexAttribArray(texcoordLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texcoords, gl.STATIC_DRAW);
        gl.vertexAttribPointer(texcoordLocation, 2, gl.FLOAT, false, 0, 0);

        gl.uniform3fv(viewPositionUniformLocation, new Float32Array(P0));
        gl.uniform3fv(lightPositionUniformLocation, new Float32Array([1.0,1.0,1.0]));

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textureChao);
        gl.uniform1i(gl.getUniformLocation(programText, "u_texture"), 0);
        
        gl.drawArrays(gl.TRIANGLES, 0, 6*6);
    }

    function drawPista() {
        partesPista.forEach(pis => {
            drawChaoTextura(1, 0, -1.8, pis.z, pistaLargura, 1, pistaTamanho);
            drawChaoTextura(1, -2, -1.8, pis.z, pistaLargura, 1, pistaTamanho);
            drawChaoTextura(1,  2, -1.8, pis.z, pistaLargura, 1, pistaTamanho);
        });
    }

    let spawnTimer = 0;

    function resetGame() {
        currentLane = 1;
        posX = lanes[currentLane];
        posY = 0;
        posZ = 0;
        gameOver = false;
        obstacles = [];
        spawnTimer = 0;

        partesPista = [];
        for (let i = 0; i < 10; i++) {
            spawnPartePista(-i * pistaTamanho);
        }

        document.getElementById('tela-gameover').style.display = "none";
        document.getElementById('tela-start').style.display = "flex";
        jogoIniciado = false;
    }

    document.getElementById('botao-reset').addEventListener("click",resetGame);

    document.getElementById('botao-start').addEventListener("click", () => {
        jogoIniciado = true;
        document.getElementById('tela-start').style.display = "none";
        drawScene();
    })

    function drawScene() {

        if(!jogoIniciado) {
            return; // Não desenha nada
        }

        if(gameOver) {
            // Desenhar Pochacco de frente
            document.getElementById('tela-gameover').style.display = "flex";
            return;
        }

        if(distPercorrida >= distVitoria && !vitoria) vitoria = true;

        if (vitoria) {
            console.log("Ganhou!");
            
            // 1. Para o jogo (opcional, mas recomendado)
            jogoIniciado = false; 

            // 2. MOSTRA a tela de vitória (onde está o botão)
            document.getElementById('tela-vitoria').style.display = "flex";
            return; 
        }

        requestAnimationFrame(drawScene);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        spawnTimer++;
        if (spawnTimer > 20) {
            spawnObstacle();
            spawnTimer = 0;
        }

        checkCollision();
        cleanObstacles();
        atualizaPista();

        drawPochacco();
        drawObstacles();
        drawPista();
    }
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