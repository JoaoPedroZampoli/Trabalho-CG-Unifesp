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

    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(135 / 255, 206 / 255, 235 / 255, 1.0); // Azul ceu
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let modelViewMatrix = [];
    let inverseTransposeModelViewMatrix = [];

    // Camera Perspectiva:
    let xw_min = -2.048;
    let xw_max = 2.048;
    let yw_min = -1.0;
    let yw_max = 1.0;
    let z_near = -1.0;
    let z_far = -500.0;
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
        gl.uniform3fv(lightPositionUniformLocation, new Float32Array([2.0, 2.0, 3.0]));

        gl.drawArrays(gl.TRIANGLES, 0, 6 * 6);
    }

    //[rotação, posição câmera, posição olhar, vetor up]
    P0 = [0.0, 2.5, 3.5]; // posição da câmera
    Pref = [0.0, 0.0, -10.0]; // ponto para onde a câmera olha
    V = [0.0, 1.0, 0.0];
    viewingMatrix = m4.setViewingMatrix(P0, Pref, V);

    let velocidade = 0.01;
    let corrida = 0;
    let limite_x = 0.2;

    // Interação:
    let posX = 0;        // posição horizontal do personagem
    let posY = 0;        // posição vertical (para pular)

    //Variáveis para o movimento para frente
    let posZ = 0;        // Posição Z atual do personagem
    let speedZ = 0.75;    // Velocidade da corrida (quão rápido ele vai para o fundo)

    let velY = 0;        // velocidade vertical (pulo)
    let gravity = -0.02; // gravidade
    let jumpPower = 0.3; // força do pulo
    let isJumping = false;
    let time = 0;

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

    //obstáculos
    let obstacles = [];

    function configurarObstaculos() {
        obstacles = [
            { type: 1, x: 2, z: -10 },
            { type: 2, x: -2, z: -20 },
            { type: 3, x: 0, z: -35 },
            { type: 4, x: 2, z: -50 },
            { type: 1, x: -2, z: -65 },
            { type: 2, x: 0, z: -80 },
            { type: 5, x: 2, z: -90 },
            { type: 6, x: -2, z: -110 },
            { type: 7, x: 0, z: -120 },
            { type: 1, x: -2, z: -130 },
            { type: 5, x: 2, z: -95 },
            { type: 6, x: -2, z: -115 },
            { type: 7, x: 0, z: -125 },
            { type: 1, x: 0, z: -145 },
            { type: 5, x: 2, z: -148 },
            { type: 6, x: -2, z: -205 },
            { type: 7, x: 0, z: -214 },
            { type: 1, x: 0, z: -135 },
            { type: 5, x: 2, z: -140 },
            { type: 6, x: -2, z: -200 },
            { type: 7, x: 0, z: -210 },
            { type: 2, x: -2, z: -220 },
            { type: 3, x: 0, z: -240 },
            { type: 4, x: 2, z: -250},
            { type: 1, x: -2, z: -270 },
            { type: 1, x: 2, z: -275 },
            { type: 2, x: -2, z: -280 },
            { type: 3, x: 0, z: -282 },
            { type: 4, x: 2, z: -298 },
            { type: 1, x: -2, z: -300 },
            { type: 2, x: 0, z: -305 },
            { type: 5, x: 2, z: -310 },
            { type: 6, x: -2, z: -325 },
            { type: 7, x: 0, z: -325 },
            { type: 1, x: -2, z: -328 },
            { type: 5, x: 2, z: 330 },
            { type: 6, x: -2, z: -350 },
            { type: 7, x: 0, z: -350 },
            { type: 1, x: 0, z: -350 },
            { type: 5, x: 2, z: -355},
            { type: 6, x: -2, z: -355},
            { type: 7, x: 0, z: -355},
            { type: 1, x: 0, z: -360 },
            { type: 5, x: 2, z: -360 },
            { type: 6, x: -2, z: -370 },
            { type: 7, x: 0, z: -375 },
            { type: 2, x: -2, z: -380 },
            { type: 3, x: 0, z: -383 },
            { type: 4, x: 2, z: 385},
            { type: 1, x: -2, z: -390 }
        ];
    }

    configurarObstaculos();

    // Final da pista
    const FINISH_LINE_Z = -5.0;  // O quão longe é o final (ajuste conforme quiser)
    let jogoIniciado = false;      // Controle para parar o jogo
    let gameOver = false;          // Controle para tela de game over

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

        // Atualiza câmera com base na posição atual do personagem:
        P0 = [posX, 0.6, 3.0];      // câmera que segue o personagem
        Pref = [posX, 0.0, -10.0];  // olhar para frente do personagem
        V = [0.0, 1.0, 0.0];        // vetor "up"
        viewingMatrix = m4.setViewingMatrix(P0, Pref, V);
    }

    const btnReset = document.getElementById('botao-comeca-tudo-de-novo');

    const btnPodium = document.getElementById('botao-ver-podio');

    if (btnReset) {
        btnReset.addEventListener("click", () => {
            window.location.href = "index.html?fase=1";
        });
    }

    if (btnPodium) {
        btnPodium.addEventListener("click", () => {
            window.location.href = "index.html?fase=podium";
        });
    }

    function drawChococat(offsetX, offsetY, offsetZ) {
        // Atualiza o tempo
        time += 0.30;

        let armL_AngleX = 0, armR_AngleX = 0;
        let armL_AngleZ = 0, armR_AngleZ = 0;
        let legL_AngleX = 0, legR_AngleX = 0;
        let legL_AngleZ = 0, legR_AngleZ = 0;

        if (isJumping) {
            armL_AngleZ = 150; armR_AngleZ = -150;
            legL_AngleZ = 150; legR_AngleZ = -150;
            armL_AngleX = 0; armR_AngleX = 0;
            legL_AngleX = 0; legR_AngleX = 0;
        } else {
            let walkCycle = Math.sin(time) * 25;
            armL_AngleX = -walkCycle; armR_AngleX = walkCycle;
            legL_AngleX = walkCycle; legR_AngleX = -walkCycle;
            armL_AngleZ = 0; armR_AngleZ = 0;
            legL_AngleZ = 0; legR_AngleZ = 0;
        }

        const rB = 0.1, gB = 0.1, bB = 0.1;
        theta_x = 0; theta_y = 0; theta_z = 0;

        // Cabeça
        drawCube(1.0, rB, gB, bB, 0 + offsetX, 0 + offsetY, 0 - offsetZ, 1, 1, 1);

        // Bigodes
        drawCube(0.2, rB, gB, bB, 0 + offsetX, -0.35 + offsetY, 0.05 - offsetZ, 5, 1.5, 5);

        theta_z = -80; drawCube(0.08, rB, gB, bB, 0.5 + offsetX, -0.2 + offsetY, 0.4 - offsetZ, 1, 6, 1);
        theta_z = 70; drawCube(0.08, rB, gB, bB, 0.5 + offsetX, -0.25 + offsetY, 0.4 - offsetZ, 1, 6, 1);
        theta_z = 80; drawCube(0.08, rB, gB, bB, -0.5 + offsetX, -0.2 + offsetY, 0.4 - offsetZ, 1, 6, 1);
        theta_z = -70; drawCube(0.08, rB, gB, bB, -0.5 + offsetX, -0.25 + offsetY, 0.4 - offsetZ, 1, 6, 1);
        theta_z = 0;

        // Olhos
        drawCube(0.2, 1.0, 1.0, 1.0, -0.3 + offsetX, -0.06 + offsetY, 0.5 - offsetZ, 1.5, 2, 1);
        drawCube(0.1, rB, gB, bB, -0.25 + offsetX, -0.15 + offsetY, 0.6 - offsetZ, 1, 2, 1);
        drawCube(0.2, 1.0, 1.0, 1.0, 0.3 + offsetX, -0.06 + offsetY, 0.5 - offsetZ, 1.5, 2, 1);
        drawCube(0.1, rB, gB, bB, 0.25 + offsetX, -0.15 + offsetY, 0.6 - offsetZ, 1, 2, 1);

        // Focinho
        drawCube(0.1, 0.5, 0.2, 0.0, 0.0 + offsetX, -0.2 + offsetY, 0.55 - offsetZ, 1.5, 1, 1);

        // Orelhas
        drawCube(0.10, 1.0, 0.97, 0.7, -0.30 + offsetX, 0.55 + offsetY, 0.45 - offsetZ, 1, 1, 1);
        drawCube(0.1, rB, gB, bB, -0.30 + offsetX, 0.75 + offsetY, 0.4 - offsetZ, 1, 1.5, 1.5);
        drawCube(0.25, rB, gB, bB, -0.30 + offsetX, 0.55 + offsetY, 0.35 - offsetZ, 1, 1, 1);

        drawCube(0.10, 1.0, 0.97, 0.7, 0.30 + offsetX, 0.55 + offsetY, 0.45 - offsetZ, 1, 1, 1);
        drawCube(0.1, rB, gB, bB, 0.30 + offsetX, 0.75 + offsetY, 0.4 - offsetZ, 1, 1.5, 1.5);
        drawCube(0.25, rB, gB, bB, 0.30 + offsetX, 0.55 + offsetY, 0.35 - offsetZ, 1, 1, 1);

        // Corpo
        drawCube(0.85, rB, gB, bB, 0 + offsetX, -0.85 + offsetY, 0.05 - offsetZ, 0.8, 0.7, 1.1);
        drawCube(1.0, 0.0, 0.0, 1.0, 0 + offsetX, -0.55 + offsetY, 0.05 - offsetZ, 0.8, 0.1, 1.2);
        drawCube(0.9, rB, gB, bB, 0 + offsetX, -0.8 + offsetY, 0.05 - offsetZ, 0.9, 0.5, 1.2);

        // Membros (com ajuste de Z no pulo)
        theta_x = armL_AngleX; theta_z = armL_AngleZ;
        let adjArmY = isJumping ? 0.2 : 0.0;
        drawCube(0.08, rB, gB, bB, -0.5 + offsetX, -0.9 + offsetY + adjArmY, 0.1 - offsetZ, 2.5, 7, 2.0);

        theta_x = armR_AngleX; theta_z = armR_AngleZ;
        drawCube(0.08, rB, gB, bB, 0.5 + offsetX, -0.9 + offsetY + adjArmY, 0.1 - offsetZ, 2.5, 7, 2.0);
        theta_x = 0; theta_z = 0;

        theta_x = legL_AngleX; theta_z = legL_AngleZ;
        let posLegLX = isJumping ? -0.4 : -0.22;
        drawCube(0.4, rB, gB, bB, posLegLX + offsetX, -1.30 + offsetY, 0 - offsetZ, 0.75, 1.0, 1);

        theta_x = legR_AngleX; theta_z = legR_AngleZ;
        let posLegRX = isJumping ? 0.4 : 0.22;
        drawCube(0.4, rB, gB, bB, posLegRX + offsetX, -1.30 + offsetY, 0 - offsetZ, 0.75, 1.0, 1);
        theta_x = 0; theta_z = 0;

        // Rabo
        theta_z = isJumping ? 0 : legL_AngleX;
        drawCube(0.1, rB, gB, bB, 0.0 + offsetX, -1.1 + offsetY, -0.65 - offsetZ, 1.5, 6, 1.0);
        theta_z = 0;
    }

    // Textura para brigadeiro
    const textureBrig = gl.createTexture();
    const imageBrig = new Image();
    imageBrig.src = "Pista-Chococat/brigadeiro.jpg";
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

    // Textura para beijinho
    const textureBeijinho = gl.createTexture();
    const imageBeijinho = new Image();
    imageBeijinho.src = "Pista-Chococat/beijinho.jpg";
    imageBeijinho.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, textureBeijinho);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imageBeijinho);

        // Allow non-power-of-two textures correctly (NO MIPMAPS)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textureBeijinho);
        const texLocation = gl.getUniformLocation(programText, "u_texture");

        gl.uniform1i(texLocation, 0); // use TEXTURE0

        drawScene();
    };

    function drawBeijinho(posicaoX, posicaoZ) {
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
        gl.bindTexture(gl.TEXTURE_2D, textureBeijinho);
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
        modelViewMatrix = m4.translate(modelViewMatrix, posicaoX, -0.8, posicaoZ); //modelViewMatrix = m4.translate(modelViewMatrix, posicaoX, -0.8, posicaoZ); o troço desaparece

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

    function drawDoceLeite(posicaoX, posicaoZ) {
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

        const conicVertices = setSuperConicSphereVertices(0.5, 40, 20, 0.5, 2);
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

        gl.uniform3fv(colorUniformLocation, new Float32Array([0.10, 0.02, 0.01]));
        gl.uniform3fv(viewPositionUniformLocation, new Float32Array(P0));
        gl.uniform3fv(lightPositionUniformLocation, new Float32Array([0.0, -0.5, -8]));

        gl.drawArrays(gl.TRIANGLES, 0, conicVertices.length / 3);
    }

    function drawFruittella(posicaoX, posicaoZ) {
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

        const conicVertices = setSuperConicSphereVertices(0.5, 60, 20, 0.5, 0.8);
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

        gl.uniform3fv(colorUniformLocation, new Float32Array([0.9, 0.0, 0.0]));
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

    // Textura para chao
    const textureChao = gl.createTexture();
    const imageChao = new Image();
    imageChao.src = "Pista-Chococat/pista-granulado.jpg";
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

    function drawFinishLine() {

        let zPos = -FINISH_LINE_Z;

        // Coluna Esquerda (Cinza)
        drawCube(1.0, 0.5, 0.5, 0.5, -3.5, 0, zPos, 1.05, 6, 1.05);

        // Coluna Direita (Cinza)
        drawCube(1.0, 0.5, 0.5, 0.5, 3.5, 0, zPos, 1.05, 6, 1.05);

        // Faixa de Chegada em cima
        // Esticada no eixo X (sx=8)
        drawCube(1.0, 1.0, 0.5, 0.5, 0, 2.5, zPos, 8, 2.5, 0.2);

        //faixa vermelha
        drawCube(1.0, 1.0, 0.0, 0.0, 0, -0.5, zPos + 0.1, 8, 0.5, 0.2);

        // Faixa no chão (Branca)
        drawCube(1.0, 1.0, 1.0, 1.0, 0, -1.34, zPos, 8, 0.1, 1);

        //(2.5 de altura - 1.8 do chão) / 2 = 0.25 de elevação

        // letras F I M

        //letra F
        drawCube(1.0, 1.0, 1.0, 0.0, -2.0, 2.2, zPos - 0.1, 0.4, 1.0, 0.2); // letra F cor blue
        drawCube(1.0, 1.0, 1.0, 0.0, -1.6, 2.55, zPos - 0.1, 0.8, 0.3, 0.2); // letra F cor blue
        drawCube(1.0, 1.0, 1.0, 0.0, -1.6, 2.15, zPos - 0.1, 0.4, 0.3, 0.2); // letra F cor blue

        //letra I
        drawCube(1.0, 1.0, 1.0, 0.0, -0.5, 2.55, zPos - 0.1, 0.4, 0.3, 0.2); // letra I cor verde 
        drawCube(1.0, 1.0, 1.0, 0.0, -0.5, 2.0, zPos - 0.1, 0.4, 0.6, 0.2); // letra I cor verde 

        //letra M
        drawCube(1.0, 1.0, 1.0, 0.0, 0.4, 2.2, zPos - 0.1, 0.4, 1.0, 0.2); // letra M cor  vermelha inicio 
        drawCube(1.0, 1.0, 1.0, 0.0, 0.8, 2.55, zPos - 0.1, 0.4, 0.3, 0.2); // letra M cor  vermelha 
        drawCube(1.0, 1.0, 1.0, 0.0, 1.2, 2.25, zPos - 0.1, 0.4, 0.3, 0.2); // letra M cor  vermelha meio        
        drawCube(1.0, 1.0, 1.0, 0.0, 1.6, 2.55, zPos - 0.1, 0.4, 0.3, 0.2); // letra M cor  vermelha 
        drawCube(1.0, 1.0, 1.0, 0.0, 2.0, 2.2, zPos - 0.1, 0.4, 1.0, 0.2); // letra M cor vermelha final

    }

    function checkCollisions() {
        // Tamanho da "Caixa" de colisão (Hitbox)
        // Como nossos cubos têm tamanho aproximado de 1.0, 
        // uma distância menor que 0.8 significa que eles se tocaram.
        let hitDist = 0.8;

        for (let i = 0; i < obstacles.length; i++) {
            let obs = obstacles[i];

            // 1. Verifica se estão na mesma Pista (X)
            // Usamos Math.abs para ver a diferença absoluta (distância)
            let dist_X = Math.abs(posX - obs.x);

            // 2. Verifica a profundidade (Z)
            // O posZ do gato muda. O obs.z é fixo.
            let dist_Z = Math.abs(posZ - obs.z);

            // 3. Verifica a altura (Y) - Pulo
            // Se o gato estiver no ar (posY alto), ele passa por cima.
            // Vamos dizer que se posY > 1.2 ele desvia.
            let safeHeight = 1.2;

            // LÓGICA FINAL:
            // Se X for perto E Z for perto E o gato estiver baixo... COLISÃO!
            if (dist_X < hitDist && dist_Z < hitDist && posY < safeHeight) {
                gameOver = true;
                return true; // Bateu!
            }
        }
        return false; // Não bateu em nada
    }

    let spawnTimer = 0;

    function resetGame() {
        currentLane = 1;
        posX = lanes[currentLane];
        posY = 0;
        posZ = 0;
        time = 0;
        spawnTimer = 0;
        isJumping = false;
        gameOver = false;
        jogoIniciado = false;

        configurarObstaculos();

        partesPista = [];
        for (let i = 0; i < 10; i++) {
            spawnPartePista(-i * pistaTamanho);
        }

        P0 = [posX, 0.6, 3.0];
        Pref = [posX, 0.0, -10.0];
        V = [0.0, 1.0, 0.0];
        viewingMatrix = m4.setViewingMatrix(P0, Pref, V);

        document.getElementById('tela-gameover').style.display = "none";
        document.getElementById('tela-start').style.display = "flex";

        drawScene();
    }

    document.getElementById('botao-reset').addEventListener("click", resetGame);

    document.getElementById('botao-start').addEventListener("click", () => {
        jogoIniciado = true;
        document.getElementById('tela-start').style.display = "none";
        drawScene();
    })

    function drawScene() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        if (jogoIniciado) {
            // --- ESTADO: JOGO RODANDO ---

            // Física
            posZ -= speedZ;

            // Colisão
            if (checkCollisions()) {
                jogoIniciado = false;
                console.log("GAME OVER");
                document.getElementById('tela-gameover').style.display = "flex";
                return;
            }
            // chegada
            if (posZ + 1.5 <= FINISH_LINE_Z) {
                jogoIniciado = false;
                console.log("VENCEU!");
                document.getElementById('tela-vitoria-final').style.display = "flex";
                return;
            }

            // Movimento do Gato
            if (corrida > limite_x) { velocidade = -velocidade; }
            else if (corrida < 0) { velocidade = -velocidade; }
            corrida += velocidade;

            posY += velY;
            velY += gravity;
            if (posY <= 0) { posY = 0; velY = 0; isJumping = false; }

            // Câmera de Corrida (Seguindo)
            P0 = [posX, 1.2, posZ + 4.0];
            Pref = [posX, 0.0, posZ - 10.0];
            V = [0.0, 1.0, 0.0];
            viewingMatrix = m4.setViewingMatrix(P0, Pref, V);

            drawChococat(posX, posY, posZ);

        } else {
            // --- ESTADO: VITÓRIA / FIM DE JOGO ---
            // ainda vou ter que mudar
        }

        for (let i = 0; i < obstacles.length; i++) {
            let obs = obstacles[i];

            // Só desenha se estiver perto da câmera (Otimização)
            if (obs.z < posZ + 5 && obs.z > posZ - 200) {
                if (obs.type === 1) drawBrigadeiro(obs.x, obs.z);
                else if (obs.type === 2) drawBrigadeiro(obs.x, obs.z);
                else if (obs.type === 3) drawDoceLeite(obs.x, obs.z);
                else if (obs.type === 5) drawBombomChocolate(obs.x, obs.z);
                else if (obs.type === 6) drawBeijinho(obs.x, obs.z);
                else if (obs.type === 4) drawFruittella(obs.x, obs.z);
                else if (obs.type === 7) drawCupcake(obs.x, obs.z);
            }
        }
        atualizaPista();

        drawFinishLine();

        // O chão acompanha o Z do chococat (seja correndo ou parado no pódio)
        drawPista(posZ);

        requestAnimationFrame(drawScene);
    }
    drawScene();
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

main();