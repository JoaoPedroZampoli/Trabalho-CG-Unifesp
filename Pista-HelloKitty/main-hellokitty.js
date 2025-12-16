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

function setCubeVertices(side) {
    let v = side / 2;
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
        [0, 0, 1], // front
        [-1, 0, 0], // left
        [0, 0, -1], // back
        [1, 0, 0], // right
        [0, 1, 0], // top
        [0, -1, 0], // bottom
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
    
    // Buffers específicos para o seu modelo do Blender
    const objVertexBuffer = gl.createBuffer();
    const objNormalBuffer = gl.createBuffer();
    let objData = null; // Variável para guardar o modelo

    // Função que vai lá buscar o arquivo
    async function carregarModeloBlender() {
        try {
            const response = await fetch('rosquinhar.obj');
            const text = await response.text();
            objData = parseOBJ(text);

            // Guardar Posições
            gl.bindBuffer(gl.ARRAY_BUFFER, objVertexBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, objData.positions, gl.STATIC_DRAW);

            // Guardar Normais
            gl.bindBuffer(gl.ARRAY_BUFFER, objNormalBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, objData.normals, gl.STATIC_DRAW);
            
            console.log("Modelo carregado com sucesso!");
        } catch (e) {
            console.error("Não consegui carregar o arquivo .obj. Você está usando um servidor local?", e);
        }
    }

    carregarModeloBlender(); // Chama a função para começar a carregar

    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(1.0, 0.75, 0.8, 1.0); // Azul ceu
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
    let projectionMatrix = m4.setPerspectiveProjectionMatrix(xw_min, xw_max, yw_min, yw_max, z_near, z_far);

    // para cubos
    let vertices = [];
    let theta_x = 0; let theta_y = 0; let theta_z = 0;
    function drawCube(tam, r, g, b, add_x, add_y, add_z, sx, sy, sz) {
        gl.useProgram(program);

        const positionLocation = gl.getAttribLocation(program, 'a_position');
        const normalLocation = gl.getAttribLocation(program, 'a_normal');

        const colorUniformLocation = gl.getUniformLocation(program, 'u_color');

        const modelViewMatrixUniformLocation = gl.getUniformLocation(program, 'u_modelViewMatrix');
        const viewingMatrixUniformLocation = gl.getUniformLocation(program, 'u_viewingMatrix');
        const projectionMatrixUniformLocation = gl.getUniformLocation(program, 'u_projectionMatrix');
        const inverseTransposeModelViewMatrixUniformLocation = gl.getUniformLocation(program, `u_inverseTransposeModelViewMatrix`);

        const lightPositionUniformLocation = gl.getUniformLocation(program, 'u_lightPosition');
        const viewPositionUniformLocation = gl.getUniformLocation(program, 'u_viewPosition');

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
        modelViewMatrix = m4.xRotate(modelViewMatrix, degToRad(theta_x));
        modelViewMatrix = m4.yRotate(modelViewMatrix, degToRad(theta_y));
        modelViewMatrix = m4.zRotate(modelViewMatrix, degToRad(theta_z));
        modelViewMatrix = m4.translate(modelViewMatrix, add_x, add_y, -add_z);

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

    // Adicionei 'rotacaoX' no final dos argumentos
    function drawMeuModeloOBJ(px, py, pz, escala, rotacaoY = 0) {
        if (!objData) return; 

        gl.useProgram(program); 

        // ... (Atributos e Buffers iguais ao anterior) ...
        const positionLocation = gl.getAttribLocation(program, 'a_position');
        const normalLocation = gl.getAttribLocation(program, 'a_normal');
        
        gl.enableVertexAttribArray(positionLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, objVertexBuffer);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

        gl.enableVertexAttribArray(normalLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, objNormalBuffer);
        gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);

        // --- MATRIZES ---
        modelViewMatrix = m4.identity();
        modelViewMatrix = m4.translate(modelViewMatrix, px, py, pz);
        
        // ROTAÇÃO EXTRA (Para a animação funcionar)
        if (rotacaoY !== 0) {
            modelViewMatrix = m4.yRotate(modelViewMatrix, degToRad(rotacaoY));
            // Se quiser que ela gire igual roda (cambalhota), use xRotate.
            // Se quiser que ela gire igual pião, use yRotate.
        }

        modelViewMatrix = m4.scale(modelViewMatrix, escala, escala, escala);
        
        inverseTransposeModelViewMatrix = m4.transpose(m4.inverse(modelViewMatrix));

        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_modelViewMatrix'), false, modelViewMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_inverseTransposeModelViewMatrix'), false, inverseTransposeModelViewMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_viewingMatrix'), false, viewingMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_projectionMatrix'), false, projectionMatrix);

        // Cor Rosa
        gl.uniform3fv(gl.getUniformLocation(program, 'u_color'), [0.9, 0.4, 0.6]); 
        gl.uniform3fv(gl.getUniformLocation(program, 'u_viewPosition'), new Float32Array(P0));
        gl.uniform3fv(gl.getUniformLocation(program, 'u_lightPosition'), [2.0, 5.0, 5.0]);

        gl.drawArrays(gl.TRIANGLES, 0, objData.count);
    }

    P0 = [0.0, 2.5, 3.5];
    Pref = [0.0, 0.0, -10.0];
    V = [0.0, 1.0, 0.0];
    viewingMatrix = m4.setViewingMatrix(P0, Pref, V);

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
    let velZ = 0.25;  // velocidade para andar
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

            // 1. Valores padrão para doces pequenos (brigadeiro, morango)
            let larguraHitbox = 0.8; 
            let alturaHitbox = 0.5;

            // 2. AJUSTE PARA A ROSQUINHA (Ela é maior!)
            if (o.type === "rosquinha") {
                larguraHitbox = 1.2; // Aumentamos a largura (era 0.8)
                alturaHitbox = 1.5;  // Aumentamos a altura (era 0.5) -> Assim, mesmo pulando baixo, você bate.
            }

            // 3. AJUSTE PARA O CUPCAKE (Ele é alto)
            if (o.type === "cupcake") {
                alturaHitbox = 1.0;
            }

            // Verifica a colisão com os valores ajustados
            if (dx < larguraHitbox && dz < larguraHitbox && posY < alturaHitbox) {
                console.log("Colisão detectada com: " + o.type);
                gameOver = true;
            }
        });
    }

    function spawnObstacle() {
        const lanes = [-2, 0, 2];
        const types = ["brigadeiro", "morango", "bombom", "melao", "cupcake"];

        // 1. Sorteamos o tipo e a pista ANTES de criar o objeto
        let tipoSorteado = types[Math.floor(Math.random() * types.length)];
        let laneSorteada = lanes[Math.floor(Math.random() * lanes.length)];

        // 2. Criamos o objeto básico
        let novoObstaculo = {
            type: tipoSorteado,
            x: laneSorteada,
            z: posZ - 30,
            raio: 0.6
        };

        // 3. A MÁGICA: Se for cupcake, criamos a cor AGORA e salvamos no objeto
        if (tipoSorteado === "cupcake") {
            novoObstaculo.corCobertura = [
                0.3 + Math.random() * 0.2, // R (Vermelho)
                0.3 + Math.random() * 0.4, // G (Verde)
                0.3 + Math.random() * 0.6  // B (Azul)
            ];
            // Nota: O "0.3 +" serve para a cor não ficar muito escura/preta
        }

        // 4. Adiciona na lista
        obstacles.push(novoObstaculo);
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
            else if (o.type === "bombom")
                drawBombomChocolate(o.x, o.z);
            else if (o.type === "cupcake") { 
                let corParaUsar = o.corCobertura || [1.0, 0.4, 0.7]; 
                drawCupcake(o.x, o.z, corParaUsar);
            }
                
            
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
    bodyElement.addEventListener("keydown", keyDown, false);

    function keyDown(event) {
        switch (event.key) {
            case 'ArrowRight':
                if (currentLane < 2) { // só pode ir para a direita se não estiver na última pista
                    currentLane++;
                }
                break;
            case 'ArrowLeft':
                if (currentLane > 0) { // só pode ir para a esquerda se não estiver na primeira pista
                    currentLane--;
                }
                break;
            case 'ArrowUp':
                if (!isJumping) {      // só pula se não estiver no ar
                    velY = jumpPower;
                    isJumping = true;
                }
                break;
        }

        // Atualiza posX com base na pista atual
        posX = lanes[currentLane];
    }

    function drawHelloKitty() {

        posZ -= velZ; // personagem andando
        distPercorrida = Math.abs(posZ);

        if (corridaOrelhas > limite_x) {
            velocidadeOrelhas = -velocidadeOrelhas;
        } else if (corridaOrelhas < 0) {
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
        if (posY <= 0) {
            posY = 0;
            velY = 0;
            isJumping = false;  // personagem voltou ao chão
        }

        let offsetX = posX;
        let offsetY = posY;
        const rB = 1.0, gB = 1.0, bB = 1.0; // branco
        //tam, r, g, b, add_x, add_y, add_z, sx, sy, sz

        //cabeça
        drawCube(1.0, rB, gB, bB, 0 + offsetX, -0.15 + offsetY, 0 - posZ, 1.2, 0.8, 1);                   // cima
        
        // Bigodes
        theta_z = -60; drawCube(0.06, 0, 0, 0, 0.6 + offsetX, -0.1 + offsetY, 0.5 - posZ, 1, 3, 1);    // bigode direito
        theta_z = 50; drawCube(0.06, 0, 0, 0, 0.6 + offsetX, -0.47 + offsetY, 0.5 - posZ, 1, 3, 1);   // bigode direito embaixo
        theta_z = 90; drawCube(0.06, 0, 0, 0, 0.6 + offsetX, -0.3 + offsetY, 0.5 - posZ, 1, 3, 1);   // bigode direito hk

        theta_z = 60; drawCube(0.06, 0, 0, 0, -0.6 + offsetX, -0.1 + offsetY, 0.5 - posZ, 1, 3, 1);    // bigode esquerdo
        theta_z = -50; drawCube(0.06, 0, 0, 0, -0.6 + offsetX, -0.47 + offsetY, 0.5 - posZ, 1, 3, 1);  // bigode esquerdo
        theta_z = -90; drawCube(0.06, 0, 0, 0, -0.6 + offsetX, -0.3 + offsetY, 0.5 - posZ, 1, 3, 1);   // bigode esquerdo hk

        // Lacinho
        theta_z = 65; drawCube(0.22, 0.824, 0.275, 0.275, 0.15 + offsetX, 0.27 + offsetY, 0.5 - posZ, 1, 1.2, 1);   // lacinho esq
        theta_z = 65; drawCube(0.22, 0.824, 0.275, 0.275, 0.42 + offsetX, 0.14 + offsetY, 0.5 - posZ, 1, 1.2, 1);   // lacinho dir
        theta_z = 65; drawCube(0.14, 0.718, 0.204, 0.204, 0.28 + offsetX, 0.21 + offsetY, 0.6 - posZ, 1, 1.2, 1);   // lacinho quadrado meio
        theta_z = 65; drawCube(0.07, 0.725, 0.075, 0.388, 0.409 + offsetX, 0.16 + offsetY, 0.6 - posZ, 1, 1.2, 1);   // lacinho quadrado meio dir
        theta_z = 65; drawCube(0.07, 0.725, 0.075, 0.388, 0.165 + offsetX, 0.27 + offsetY, 0.6 - posZ, 1, 1.2, 1);   // lacinho quadrado meio esq
        theta_z = 0;

        //olho - esquerdo (em relacao a minha visao)
        drawCube(0.1, 0, 0, 0, -0.25 + offsetX, -0.18 + offsetY, 0.6 - posZ, 1, 2, 1);      // pretinho
        //olho - direito (em relacao a minha visao)
        drawCube(0.1, 0, 0, 0, 0.25 + offsetX, -0.18 + offsetY, 0.6 - posZ, 1, 2, 1);       // oretinho
        // fucinho
        drawCube(0.1, 0.93, 0.93, 0.455, 0.0 + offsetX, -0.25 + offsetY, 0.55 - posZ, 1.5, 1, 1);

        //orelha - esq
        drawCube(0.25, rB, gB, bB, -0.30 + offsetX, 0.35 + offsetY, 0.35 - posZ, 1, 1, 1);     //preto maior
        //orelha - dir
        drawCube(0.25, rB, gB, bB, 0.30 + offsetX, 0.35 + offsetY, 0.35 - posZ, 1, 1, 1);      //preto maior

        // Braços
        theta_z = -15; drawCube(0.08, rB, gB, bB, -0.5 + offsetX, -0.9 + offsetY, 0.4 - posZ, 1.5, 6, 1);   // braço esquerda
        theta_z = 15; drawCube(0.08, rB, gB, bB, 0.5 + offsetX, -0.9 + offsetY, 0.4 - posZ, 1.5, 6, 1);    // braço esquerda
        theta_z = -15; drawCube(0.1, 0.93, 0.93, 0.455, -0.5 + offsetX, -0.8 + offsetY, 0.4 - posZ, 1.5, 3, 1);  // manga camiseta esq
        theta_z = 15; drawCube(0.1, 0.93, 0.93, 0.455, 0.5 + offsetX, -0.8 + offsetY, 0.4 - posZ, 1.5, 3, 1);   // manga camiseta dir
        theta_z = 0;

        // Corpo
        drawCube(0.85, rB, gB, bB, 0 + offsetX, -0.6 + offsetY, 0.05 - posZ, 0.8, 0.3, 1.1);    // pescoco
        drawCube(0.85, 0.173, 0.149, 0.510, 0 + offsetX, -0.85 + offsetY, 0.05 - posZ, 0.8, 0.7, 1.1);    // shorts
        drawCube(1.0, 0.0, 0.0, 1.0, 0 + offsetX, -0.87 + offsetY, 0.05 - posZ, 0.9, 0.3, 1.2); // roupinha grande
        drawCube(1.0, 0.0, 0.0, 1.0, -0.2 + offsetX, -0.71 + offsetY, 0.05 - posZ, 0.15, 0.3, 1.2); // roupinha parte esq

        drawCube(1.0, 0.0, 0.0, 1.0, 0.2 + offsetX, -0.71 + offsetY, 0.05 - posZ, 0.15, 0.3, 1.2); // roupinha parte dir
        drawCube(0.9, 0.93, 0.93, 0.455, 0 + offsetX, -0.8 + offsetY, 0.05 - posZ, 0.9, 0.5, 1.2);      // barriga amarela

        // Pernas
        drawCube(0.4, rB, gB, bB, -0.22 + offsetX, -1.35 + offsetY, 0 - posZ, 0.75, 0.6, 1);    // perna esquerda
        drawCube(0.4, rB, gB, bB, 0.22 + offsetX, -1.35 + offsetY, 0 - posZ, 0.75, 0.6, 1);     // perna direita

        // Atualiza câmera com base na posição atual do personagem:
        P0 = [posX, 2.5 + posY, 3.5 + posZ];
        Pref = [posX, 0.0 + posY, -10.0 + posZ];
        V = [0.0, 1.0, 0.0];
        viewingMatrix = m4.setViewingMatrix(P0, Pref, V);
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

    function drawBrigadeiro(posicaoX, posicaoZ) {
        gl.useProgram(programText);

        const positionLocation = gl.getAttribLocation(programText, 'a_position');
        const normalLocation = gl.getAttribLocation(programText, 'a_normal');
        const texcoordLocation = gl.getAttribLocation(programText, "a_texcoord");

        modelViewMatrix = m4.identity();
        modelViewMatrix = m4.translate(modelViewMatrix, posicaoX, -0.7, posicaoZ);

        inverseTransposeModelViewMatrix = m4.transpose(m4.inverse(modelViewMatrix));

        const modelViewMatrixUniformLocation = gl.getUniformLocation(programText, 'u_modelViewMatrix');
        const viewingMatrixUniformLocation = gl.getUniformLocation(programText, 'u_viewingMatrix');
        const projectionMatrixUniformLocation = gl.getUniformLocation(programText, 'u_projectionMatrix');
        const inverseTransposeModelViewMatrixUniformLocation = gl.getUniformLocation(programText, `u_inverseTransposeModelViewMatrix`);

        const lightPositionUniformLocation = gl.getUniformLocation(programText, 'u_lightPosition');
        const viewPositionUniformLocation = gl.getUniformLocation(programText, 'u_viewPosition');

        gl.uniformMatrix4fv(modelViewMatrixUniformLocation, false, modelViewMatrix);
        gl.uniformMatrix4fv(inverseTransposeModelViewMatrixUniformLocation, false, inverseTransposeModelViewMatrix);
        gl.uniformMatrix4fv(viewingMatrixUniformLocation, false, viewingMatrix);
        gl.uniformMatrix4fv(projectionMatrixUniformLocation, false, projectionMatrix);

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
        gl.uniform3fv(lightPositionUniformLocation, new Float32Array([1.0, 1.0, 1.0]));

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

    function drawBrigadeiroMorango(posicaoX, posicaoZ) {
        gl.useProgram(programText);

        const positionLocation = gl.getAttribLocation(programText, 'a_position');
        const normalLocation = gl.getAttribLocation(programText, 'a_normal');
        const texcoordLocation = gl.getAttribLocation(programText, "a_texcoord");

        modelViewMatrix = m4.identity();
        modelViewMatrix = m4.translate(modelViewMatrix, posicaoX, -0.7, posicaoZ);

        inverseTransposeModelViewMatrix = m4.transpose(m4.inverse(modelViewMatrix));

        const modelViewMatrixUniformLocation = gl.getUniformLocation(programText, 'u_modelViewMatrix');
        const viewingMatrixUniformLocation = gl.getUniformLocation(programText, 'u_viewingMatrix');
        const projectionMatrixUniformLocation = gl.getUniformLocation(programText, 'u_projectionMatrix');
        const inverseTransposeModelViewMatrixUniformLocation = gl.getUniformLocation(programText, `u_inverseTransposeModelViewMatrix`);

        const lightPositionUniformLocation = gl.getUniformLocation(programText, 'u_lightPosition');
        const viewPositionUniformLocation = gl.getUniformLocation(programText, 'u_viewPosition');

        gl.uniformMatrix4fv(modelViewMatrixUniformLocation, false, modelViewMatrix);
        gl.uniformMatrix4fv(inverseTransposeModelViewMatrixUniformLocation, false, inverseTransposeModelViewMatrix);
        gl.uniformMatrix4fv(viewingMatrixUniformLocation, false, viewingMatrix);
        gl.uniformMatrix4fv(projectionMatrixUniformLocation, false, projectionMatrix);

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
        gl.uniform3fv(lightPositionUniformLocation, new Float32Array([1.0, 1.0, 1.0]));

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

    function drawSorveteMelao(posicaoX, posicaoZ) {
        gl.useProgram(programText);

        const positionLocation = gl.getAttribLocation(programText, 'a_position');
        const normalLocation = gl.getAttribLocation(programText, 'a_normal');
        const texcoordLocation = gl.getAttribLocation(programText, "a_texcoord");

        modelViewMatrix = m4.identity();
        modelViewMatrix = m4.translate(modelViewMatrix, posicaoX, -0.7, posicaoZ);

        inverseTransposeModelViewMatrix = m4.transpose(m4.inverse(modelViewMatrix));

        const modelViewMatrixUniformLocation = gl.getUniformLocation(programText, 'u_modelViewMatrix');
        const viewingMatrixUniformLocation = gl.getUniformLocation(programText, 'u_viewingMatrix');
        const projectionMatrixUniformLocation = gl.getUniformLocation(programText, 'u_projectionMatrix');
        const inverseTransposeModelViewMatrixUniformLocation = gl.getUniformLocation(programText, `u_inverseTransposeModelViewMatrix`);

        const lightPositionUniformLocation = gl.getUniformLocation(programText, 'u_lightPosition');
        const viewPositionUniformLocation = gl.getUniformLocation(programText, 'u_viewPosition');

        gl.uniformMatrix4fv(modelViewMatrixUniformLocation, false, modelViewMatrix);
        gl.uniformMatrix4fv(inverseTransposeModelViewMatrixUniformLocation, false, inverseTransposeModelViewMatrix);
        gl.uniformMatrix4fv(viewingMatrixUniformLocation, false, viewingMatrix);
        gl.uniformMatrix4fv(projectionMatrixUniformLocation, false, projectionMatrix);

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
        gl.uniform3fv(lightPositionUniformLocation, new Float32Array([1.0, 1.0, 1.0]));

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textureSorveteMelao);
        gl.uniform1i(gl.getUniformLocation(programText, "u_texture"), 0);

        gl.drawElements(gl.TRIANGLES, sphereIndices.length, gl.UNSIGNED_SHORT, 0);
    }

    function drawBombomChocolate(posicaoX, posicaoZ) {
        gl.useProgram(program);

        const positionLocation = gl.getAttribLocation(program, 'a_position');
        const normalLocation = gl.getAttribLocation(program, 'a_normal');

        const colorUniformLocation = gl.getUniformLocation(program, 'u_color');

        const modelViewMatrixUniformLocation = gl.getUniformLocation(program, 'u_modelViewMatrix');
        const viewingMatrixUniformLocation = gl.getUniformLocation(program, 'u_viewingMatrix');
        const projectionMatrixUniformLocation = gl.getUniformLocation(program, 'u_projectionMatrix');
        const inverseTransposeModelViewMatrixUniformLocation = gl.getUniformLocation(program, `u_inverseTransposeModelViewMatrix`);

        const lightPositionUniformLocation = gl.getUniformLocation(program, 'u_lightPosition');
        const viewPositionUniformLocation = gl.getUniformLocation(program, 'u_viewPosition');

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
        modelViewMatrix = m4.xRotate(modelViewMatrix, degToRad(90));
        modelViewMatrix = m4.translate(modelViewMatrix, posicaoX, -0.8, posicaoZ);

        inverseTransposeModelViewMatrix = m4.transpose(m4.inverse(modelViewMatrix));

        gl.uniformMatrix4fv(modelViewMatrixUniformLocation, false, modelViewMatrix);
        gl.uniformMatrix4fv(inverseTransposeModelViewMatrixUniformLocation, false, inverseTransposeModelViewMatrix);
        gl.uniformMatrix4fv(viewingMatrixUniformLocation, false, viewingMatrix);
        gl.uniformMatrix4fv(projectionMatrixUniformLocation, false, projectionMatrix);

        gl.uniform3fv(colorUniformLocation, new Float32Array([137 / 255, 81 / 255, 41 / 255]));
        gl.uniform3fv(viewPositionUniformLocation, new Float32Array(P0));
        gl.uniform3fv(lightPositionUniformLocation, new Float32Array([0.0, -0.5, -8]));

        gl.drawArrays(gl.TRIANGLES, 0, conicVertices.length / 3);
    }


    function drawCupcake(x_pos, z_pos, corRandomica) {

        // Cores 
        const corForminha = [0.2, 0.6, 0.8];    // Azulzinho
        const corMassa = [0.94, 0.90, 0.55]; // Baunilha
        const corCobertura = corRandomica || [1.0, 0.4, 0.7];  // Rosa choque
        const corCereja = [0.9, 0.0, 0.0];    // Vermelho


        // Começa mais em baixo
        let AtualY = -0.8;


        // forminha q eh base octagonal

        // Parte A: Cubo normal
        theta_y = 0;
        drawCube(1.0, corForminha[0], corForminha[1], corForminha[2], x_pos, AtualY, z_pos, 0.8, 0.7, 0.8);

        // Parte B: Cubo rodado 45 graus (cria as pontas)
        theta_y = 45;
        drawCube(1.0, corForminha[0], corForminha[1], corForminha[2], x_pos, AtualY, z_pos, 0.8, 0.7, 0.8);

        theta_y = 0;

        // Sobe para a próxima camada
        AtualY += 0.35 + 0.15;

        // massa creme
        drawCube(1.0, corMassa[0], corMassa[1], corMassa[2], x_pos, AtualY, -z_pos, 1.0, 0.3, 1.0);

        theta_y = 45;
        drawCube(1.0, corMassa[0], corMassa[1], corMassa[2], x_pos, AtualY, -z_pos, 1.0, 0.3, 1.0);
        theta_y = 0;

        AtualY += 0.15 + 0.15;

        // cobertura - Camada 1 (Base larga)
        // Um pouco menor que a massa (0.9)
        drawCube(1.0, corCobertura[0], corCobertura[1], corCobertura[2], x_pos, AtualY, -z_pos, 0.9, 0.3, 0.9);

        theta_y = 45;
        drawCube(1.0, corCobertura[0], corCobertura[1], corCobertura[2], x_pos, AtualY, -z_pos, 0.9, 0.3, 0.9);
        theta_y = 0;

        AtualY += 0.15 + 0.125; // Sobe para a próxima camada (altura 0.25)

        //cobertura - Camada 2 (Meio)
        // Mais estreita (0.65)
        drawCube(1.0, corCobertura[0], corCobertura[1], corCobertura[2], x_pos, AtualY, -z_pos, 0.65, 0.25, 0.65);

        theta_y = 45;
        drawCube(1.0, corCobertura[0], corCobertura[1], corCobertura[2], x_pos, AtualY, -z_pos, 0.65, 0.25, 0.65);
        theta_y = 0;

        AtualY += 0.125 + 0.1;

        // cobertura - Camada 3 (Topo)
        // Bem estreita (0.4)
        drawCube(1.0, corCobertura[0], corCobertura[1], corCobertura[2], x_pos, AtualY, -z_pos, 0.4, 0.2, 0.4);

        theta_y = 45;
        drawCube(1.0, corCobertura[0], corCobertura[1], corCobertura[2], x_pos, AtualY, -z_pos, 0.4, 0.2, 0.4);
        theta_y = 0;

        AtualY += 0.1 + 0.1;

        // cereja
        drawCube(1.0, corCereja[0], corCereja[1], corCereja[2], x_pos, AtualY, -z_pos, 0.2, 0.2, 0.2);
        // Cabinho da cereja 
        drawCube(0.6, 0.0, 0.5, 0.0, x_pos, AtualY + 0.15, -z_pos, 0.05, 0.7, 0.05);
        //cabo c textura
        theta_y = 45;
        drawCube(0.6, 0.0, 0.5, 0.0, x_pos, AtualY + 0.15, -z_pos, 0.05, 0.7, 0.05);
        theta_y = 0;
        //cabo inclinado
        theta_x = 120;
        drawCube(0.6, 0.0, 0.5, 0.0, x_pos, AtualY + 0.35, -(z_pos + 0.05), 0.05, 0.2, 0.05);
        theta_x = 0;

        // Granulado colorido 
        let ySprinkle = AtualY - 0.35; // Altura da camada base da cobertura
        //verde
        drawCube(0.06, 0.0, 1.0, 0.0, x_pos + 0.35, ySprinkle, z_pos + 0.35, 1, 1, 1);
        //amarelo
        drawCube(0.06, 1.0, 1.0, 0.0, x_pos - 0.35, ySprinkle, z_pos + 0.35, 1, 1, 1);
        //azul
        drawCube(0.06, 0.0, 0.0, 1.0, x_pos + 0.35, ySprinkle, z_pos - 0.35, 1, 1, 1);
        //laranja
        drawCube(0.06, 1.0, 0.5, 0.0, x_pos - 0.35, ySprinkle, z_pos - 0.35, 1, 1, 1);
        // Roxo
        drawCube(0.06, 1.0, 0.0, 1.0, x_pos + 0.45, ySprinkle, z_pos, 1, 1, 1);
        //  Ciano
        drawCube(0.06, 0.0, 1.0, 1.0, x_pos - 0.45, ySprinkle, z_pos, 1, 1, 1);
        //  Branco
        drawCube(0.06, 1.0, 1.0, 1.0, x_pos, ySprinkle, z_pos + 0.45, 1, 1, 1);
        // rosa
        drawCube(0.06, 0.906, 0.329, 0.502, x_pos, ySprinkle, z_pos - 0.45, 1, 1, 1);

    }

    // Textura para chao (XADREZ PROCEDURAL)
    const textureChao = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, textureChao);

    // Criando um tabuleiro de xadrez 8x8 direto na memória
    const size = 8;
    const dataChao = new Uint8Array(size * size * 4);
    
    // Cores do Xadrez: Branco e Rosa Claro
    const cWhite = [255, 255, 255]; 
    const cPink  = [255, 182, 193]; // Rosa 'LightPink'

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const i = (y * size + x) * 4;
            const isWhite = (x + y) % 2 === 0;
            const color = isWhite ? cWhite : cPink;

            dataChao[i] = color[0];     // R
            dataChao[i + 1] = color[1]; // G
            dataChao[i + 2] = color[2]; // B
            dataChao[i + 3] = 255;      // Alpha
        }
    }

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, dataChao);

    // Configura para ficar "pixelado" (NEAREST) e repetir (REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    drawScene();

    function drawChaoTextura(tam, add_x, add_y, add_z, sx, sy, sz) {
        gl.useProgram(programText);

        const positionLocation = gl.getAttribLocation(programText, 'a_position');
        const normalLocation = gl.getAttribLocation(programText, 'a_normal');
        const texcoordLocation = gl.getAttribLocation(programText, "a_texcoord");

        modelViewMatrix = m4.identity();
        modelViewMatrix = m4.scale(modelViewMatrix, sx, sy, sz);
        modelViewMatrix = m4.translate(modelViewMatrix, add_x, add_y, add_z);

        inverseTransposeModelViewMatrix = m4.transpose(m4.inverse(modelViewMatrix));

        const modelViewMatrixUniformLocation = gl.getUniformLocation(programText, 'u_modelViewMatrix');
        const viewingMatrixUniformLocation = gl.getUniformLocation(programText, 'u_viewingMatrix');
        const projectionMatrixUniformLocation = gl.getUniformLocation(programText, 'u_projectionMatrix');
        const inverseTransposeModelViewMatrixUniformLocation = gl.getUniformLocation(programText, `u_inverseTransposeModelViewMatrix`);

        const lightPositionUniformLocation = gl.getUniformLocation(programText, 'u_lightPosition');
        const viewPositionUniformLocation = gl.getUniformLocation(programText, 'u_viewPosition');

        gl.uniformMatrix4fv(modelViewMatrixUniformLocation, false, modelViewMatrix);
        gl.uniformMatrix4fv(inverseTransposeModelViewMatrixUniformLocation, false, inverseTransposeModelViewMatrix);
        gl.uniformMatrix4fv(viewingMatrixUniformLocation, false, viewingMatrix);
        gl.uniformMatrix4fv(projectionMatrixUniformLocation, false, projectionMatrix);

        const vertices = setCubeVertices(tam);
        const normals = setCubeNormals();

        // Repetir a textura (tiling) com base no tamanho (sx, sz)
        const repX = sx / 2; 
        const repZ = sz / 2; 

        const texcoords = new Float32Array([
            // Frente
            1, 1, 1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 
            // Esquerda
            0, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 0, 
            // Costas
            0, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 0, 
            // Direita
            1, 1, 1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 
            // Topo (Onde pisamos) - Repete o Xadrez
            repX, repZ,   repX, 0,      0, repZ,   
            0, repZ,      repX, 0,      0, 0,      
            // Fundo
            1, 1, 1, 0, 0, 1, 0, 1, 1, 0, 0, 0  
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
        gl.uniform3fv(lightPositionUniformLocation, new Float32Array([1.0, 1.0, 1.0]));

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textureChao);
        gl.uniform1i(gl.getUniformLocation(programText, "u_texture"), 0);

        gl.drawArrays(gl.TRIANGLES, 0, 6 * 6);
    }

    function drawPista() {
        partesPista.forEach(pis => {
            drawChaoTextura(1, 0, -1.8, pis.z, pistaLargura, 1, pistaTamanho);
            drawChaoTextura(1, -2, -1.8, pis.z, pistaLargura, 1, pistaTamanho);
            drawChaoTextura(1, 2, -1.8, pis.z, pistaLargura, 1, pistaTamanho);
        });
    }

    function drawDecorations() {
        // Cores: Rosa, Chocolate, Azul
        const cores = [
            [1.0, 0.85, 0.9], // Cor 1: Rosa Choque (DeepPink)
            [1.0, 0.85, 0.9], // Cor 2: Chocolate
        ];

        partesPista.forEach((pis, indexPista) => {
            for (let i = 0; i < 3; i++) {
                let zPos = pis.z + (i * 10); 
                let cor = cores[(indexPista + i) % 3]; 

                // --- AQUI ESTÁ A MUDANÇA ---
                // Se sua rosquinha estiver "em pé" (tipo roda), coloque 90.
                // Se ela estiver "deitada" (tipo no prato), coloque 0.
                let anguloFixo = 0; 

                // LADO ESQUERDO (Parada)
                drawMeuModeloOBJ(-6, -2, zPos, 0.6, anguloFixo, cor);

                // LADO DIREITO (Parada)
                drawMeuModeloOBJ(6, -2, zPos, 0.6, anguloFixo, cor);
            }
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

    document.getElementById('botao-reset').addEventListener("click", resetGame);

    document.getElementById('botao-start').addEventListener("click", () => {
        jogoIniciado = true;
        document.getElementById('tela-start').style.display = "none";
        drawScene();
    })

    function drawScene() {

        if (!jogoIniciado) {
            return; // Não desenha nada
        }

        if (gameOver) {
            // Desenhar Pochacco de frente
            document.getElementById('tela-gameover').style.display = "flex";
            return;
        }

        if (distPercorrida >= distVitoria && !vitoria) vitoria = true;

        if (vitoria) {
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

        drawHelloKitty();
        drawDecorations();

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

function unitVector(v) {
    let vModulus = vectorModulus(v);
    return v.map(function (x) { return x / vModulus; });
}

function vectorModulus(v) {
    return Math.sqrt(Math.pow(v[0], 2) + Math.pow(v[1], 2) + Math.pow(v[2], 2));
}

function radToDeg(r) {
    return r * 180 / Math.PI;
}

function degToRad(d) {
    return d * Math.PI / 180;
}

function parseOBJ(text) {
    const webglPositions = [];
    const webglNormals = [];
    const objPositions = [[0, 0, 0]]; 
    const objNormals = [[0, 0, 0]];

    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('v ')) {
            const parts = line.split(/\s+/);
            objPositions.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
        } else if (line.startsWith('vn ')) {
            const parts = line.split(/\s+/);
            objNormals.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
        } else if (line.startsWith('f ')) {
            const parts = line.split(/\s+/);
            for (let j = 1; j < parts.length - 2; j++) {
                const indicesList = [parts[1], parts[j+1], parts[j+2]];
                indicesList.forEach(idx => {
                    const vIndex = parseInt(idx.split('/')[0]);
                    const nIndex = parseInt(idx.split('/')[2]);
                    webglPositions.push(...objPositions[vIndex]);
                    if (!isNaN(nIndex)) webglNormals.push(...objNormals[nIndex]);
                    else webglNormals.push(0, 1, 0);
                });
            }
        }
    }
    return {
        positions: new Float32Array(webglPositions),
        normals: new Float32Array(webglNormals),
        count: webglPositions.length / 3
    };
}
main();