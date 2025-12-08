const vertexShaderSource = `
    attribute vec3 a_position;
    attribute vec3 a_normal;
    attribute vec3 a_color;

    varying vec3 v_normal;
    varying vec3 v_surfaceToLight;
    varying vec3 v_surfaceToView;
    varying vec3 v_color;

    uniform mat4 u_modelViewMatrix;
    uniform mat4 u_viewingMatrix;
    uniform mat4 u_projectionMatrix;
    uniform mat4 u_inverseTransposeModelViewMatrix;
    
    uniform vec3 u_lightPosition;
    uniform vec3 u_viewPosition;

    void main() {
        gl_Position = u_projectionMatrix * u_viewingMatrix * u_modelViewMatrix * vec4(a_position, 1.0);
        v_normal = normalize(mat3(u_inverseTransposeModelViewMatrix) * a_normal);
        vec3 surfacePosition = (u_modelViewMatrix * vec4(a_position, 1.0)).xyz;
        v_surfaceToLight = u_lightPosition - surfacePosition;
        v_surfaceToView = u_viewPosition - surfacePosition;
        
        v_color = a_color;
    }
`;

const fragmentShaderSource = `
    precision mediump float;
    
    varying vec3 v_color;
    varying vec3 v_normal;
    varying vec3 v_surfaceToLight;
    varying vec3 v_surfaceToView;
    
    void main() {
        vec3 ambientReflection = v_color;
        vec3 diffuseReflection = v_color;
        vec3 specularReflection = vec3(1.0, 1.0, 1.0);

        vec3 normal = normalize(v_normal);
        vec3 surfaceToLightDirection = normalize(v_surfaceToLight);
        vec3 surfaceToViewDirection = normalize(v_surfaceToView);
        vec3 halfVector = normalize(surfaceToLightDirection + surfaceToViewDirection);

        float light = max(dot(surfaceToLightDirection, normal), 0.0);
        float specular = 0.0;
        if (light > 0.0) {
            specular = pow(max(dot(normal, halfVector), 0.0), 80.0); // Brilho mais "duro" e concentrado
        }

        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        gl_FragColor.rgb = 0.5 * ambientReflection + 0.5 * light * diffuseReflection;
        gl_FragColor.rgb += 0.4 * specular * specularReflection;
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

// Função para criar um cubo com bordas chanfradas (bevel)
// radius: tamanho do chanfro (0 a 0.5)
function bakeBeveledCube(matrix, color, bevelSize = 0.05) {
    const positions = [];
    const normals = [];
    const colors = [];

    // Helper para adicionar triângulos
    function addQuad(v1, v2, v3, v4, n) {
        // Triângulo 1
        addVertex(v1, n); addVertex(v2, n); addVertex(v3, n);
        // Triângulo 2
        addVertex(v1, n); addVertex(v3, n); addVertex(v4, n);
    }

    function addVertex(v, n) {
        // Transforma Posição
        const tx = matrix[0] * v[0] + matrix[4] * v[1] + matrix[8] * v[2] + matrix[12];
        const ty = matrix[1] * v[0] + matrix[5] * v[1] + matrix[9] * v[2] + matrix[13];
        const tz = matrix[2] * v[0] + matrix[6] * v[1] + matrix[10] * v[2] + matrix[14];
        positions.push(tx, ty, tz);

        normals.push(n[0], n[1], n[2]);

        colors.push(color[0], color[1], color[2]);
    }

    // Definição dos limites internos (onde começa o chanfro)
    const min = -0.5;
    const max = 0.5;
    const innerMin = min + bevelSize;
    const innerMax = max - bevelSize;

    // Normais básicas
    const UP = [0, 1, 0]; const DOWN = [0, -1, 0];
    const LEFT = [-1, 0, 0]; const RIGHT = [1, 0, 0];
    const FRONT = [0, 0, 1]; const BACK = [0, 0, -1];

    // --- FACES PRINCIPAIS (Menores que o cubo original) ---
    // Topo
    addQuad([innerMin, max, innerMax], [innerMax, max, innerMax], [innerMax, max, innerMin], [innerMin, max, innerMin], UP);
    // Baixo
    addQuad([innerMin, min, innerMin], [innerMax, min, innerMin], [innerMax, min, innerMax], [innerMin, min, innerMax], DOWN);
    // Frente
    addQuad([innerMin, innerMax, max], [innerMax, innerMax, max], [innerMax, innerMin, max], [innerMin, innerMin, max], FRONT);
    // Trás
    addQuad([innerMax, innerMax, min], [innerMin, innerMax, min], [innerMin, innerMin, min], [innerMax, innerMin, min], BACK);
    // Esquerda
    addQuad([min, innerMax, innerMin], [min, innerMax, innerMax], [min, innerMin, innerMax], [min, innerMin, innerMin], LEFT);
    // Direita
    addQuad([max, innerMax, innerMax], [max, innerMax, innerMin], [max, innerMin, innerMin], [max, innerMin, innerMax], RIGHT);

    // --- BORDAS (CHANFROS) ---
    // Aqui foi criado as faces inclinadas que conectam as faces principais

    // Normais das bordas (45 graus)
    const nRF = normalize([1, 0, 1]); const nLF = normalize([-1, 0, 1]);
    const nRB = normalize([1, 0, -1]); const nLB = normalize([-1, 0, -1]);

    const nTF = normalize([0, 1, 1]); const nBF = normalize([0, -1, 1]);
    const nTB = normalize([0, 1, -1]); const nBB = normalize([0, -1, -1]);

    const nTR = normalize([1, 1, 0]); const nTL = normalize([-1, 1, 0]);
    const nBR = normalize([1, -1, 0]); const nBL = normalize([-1, -1, 0]);

    // Bordas Verticais (4)
    addQuad([max, innerMax, innerMax], [innerMax, innerMax, max], [innerMax, innerMin, max], [max, innerMin, innerMax], nRF); // Dir-Frente
    addQuad([innerMin, innerMax, max], [min, innerMax, innerMax], [min, innerMin, innerMax], [innerMin, innerMin, max], nLF); // Esq-Frente
    addQuad([min, innerMax, innerMin], [innerMin, innerMax, min], [innerMin, innerMin, min], [min, innerMin, innerMin], nLB); // Esq-Trás
    addQuad([innerMax, innerMax, min], [max, innerMax, innerMin], [max, innerMin, innerMin], [innerMax, innerMin, min], nRB); // Dir-Trás

    // Bordas Horizontais Superiores (4)
    addQuad([innerMin, max, innerMax], [innerMax, max, innerMax], [innerMax, innerMax, max], [innerMin, innerMax, max], nTF); // Topo-Frente
    addQuad([innerMax, max, innerMin], [innerMin, max, innerMin], [innerMin, innerMax, min], [innerMax, innerMax, min], nTB); // Topo-Trás
    addQuad([innerMax, max, innerMax], [innerMax, max, innerMin], [max, innerMax, innerMin], [max, innerMax, innerMax], nTR); // Topo-Dir
    addQuad([innerMin, max, innerMin], [innerMin, max, innerMax], [min, innerMax, innerMax], [min, innerMax, innerMin], nTL); // Topo-Esq

    // Bordas Horizontais Inferiores (4)
    addQuad([innerMin, innerMin, max], [innerMax, innerMin, max], [innerMax, min, innerMax], [innerMin, min, innerMax], nBF); // Baixo-Frente
    addQuad([innerMax, innerMin, min], [innerMin, innerMin, min], [innerMin, min, innerMin], [innerMax, min, innerMin], nBB); // Baixo-Trás
    addQuad([max, innerMin, innerMax], [max, innerMin, innerMin], [innerMax, min, innerMin], [innerMax, min, innerMax], nBR); // Baixo-Dir
    addQuad([min, innerMin, innerMin], [min, innerMin, innerMax], [innerMin, min, innerMax], [innerMin, min, innerMin], nBL); // Baixo-Esq

    // --- CANTOS (CORNERS) ---
    // São pequenos triângulos para fechar os buracos nos 8 vértices do cubo
    // (Para simplificar, será usado uma média normalizada das normais adjacentes)
    const nTRF = normalize([1, 1, 1]); const nTLF = normalize([-1, 1, 1]);
    const nTRB = normalize([1, 1, -1]); const nTLB = normalize([-1, 1, -1]);
    const nBRF = normalize([1, -1, 1]); const nBLF = normalize([-1, -1, 1]);
    const nBRB = normalize([1, -1, -1]); const nBLB = normalize([-1, -1, -1]);

    // Topo-Frente-Direita
    addVertex([innerMax, max, innerMax], nTRF); addVertex([max, innerMax, innerMax], nTRF); addVertex([innerMax, innerMax, max], nTRF);
    // Topo-Frente-Esquerda
    addVertex([innerMin, max, innerMax], nTLF); addVertex([innerMin, innerMax, max], nTLF); addVertex([min, innerMax, innerMax], nTLF);
    // Topo-Trás-Direita
    addVertex([innerMax, max, innerMin], nTRB); addVertex([innerMax, innerMax, min], nTRB); addVertex([max, innerMax, innerMin], nTRB);
    // Topo-Trás-Esquerda
    addVertex([innerMin, max, innerMin], nTLB); addVertex([min, innerMax, innerMin], nTLB); addVertex([innerMin, innerMax, min], nTLB);

    // Baixo-Frente-Direita
    addVertex([innerMax, min, innerMax], nBRF); addVertex([innerMax, innerMin, max], nBRF); addVertex([max, innerMin, innerMax], nBRF);
    // Baixo-Frente-Esquerda
    addVertex([innerMin, min, innerMax], nBLF); addVertex([min, innerMin, innerMax], nBLF); addVertex([innerMin, innerMin, max], nBLF);
    // Baixo-Trás-Direita
    addVertex([innerMax, min, innerMin], nBRB); addVertex([max, innerMin, innerMin], nBRB); addVertex([innerMax, innerMin, min], nBRB);
    // Baixo-Trás-Esquerda
    addVertex([innerMin, min, innerMin], nBLB); addVertex([innerMin, innerMin, min], nBLB); addVertex([min, innerMin, innerMin], nBLB);

    return { positions, normals, colors };
}

function normalize(v) {
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    return [v[0] / len, v[1] / len, v[2] / len];
}

function createCakeMesh() {

    let allPos = [];
    let allNor = [];
    let allCol = [];

    // Design inspirado na imagem "chocolate com morango"
    const width = 2.0;
    const depth = 4.0; // Bolo retangular

    //bolo com massa e cobertura de chocolate
    const cMassa = [0.30, 0.15, 0.05]; // Chocolate ao leite parte qhe envolve tudo
    const cRecheio = [0.40, 0.20, 0.10]; // Recheio creme/mousse
    const cCobertura = [0.20, 0.10, 0.05]; // Ganache brilhante
    const cBombom = [0.30, 0.15, 0.05];

    //bolo de chocolate com recheio de morango
    //const cMassa = [0.30, 0.15, 0.05]; // Chocolate ao leite
    //const cRecheio = [0.90, 0.40, 0.40]; // Recheio rosado/vermelho (morango)
    //const cCobertura = [0.10, 0.02, 0.01]; // Ganache brilhante
    //const cBombom = [0.30, 0.15, 0.05];

    //bolo com massa e cobertura de chocolate branco
    //const cMassa = [0.94,0.90,0.55]; // Chocolate branco
    //const cRecheio = [1.0, 1.0, 0.85]; // Recheio creme/mousse
    //const cCobertura = [1.0, 1.0, 0.9]; // Ganache brilhante
    //const cBombom = [0.30, 0.15, 0.05];

    //bolo com massa e recheio de baunilha com cobertura de chocolate
    //const cMassa = [0.94,0.90,0.55]; // Chocolate branco
    //const cRecheio = [1.0, 1.0, 0.85]; // Recheio creme/mousse
    //const cCobertura = [0.15, 0.10, 0.05]; // Ganache brilhante
    //const cBombom = [0.30, 0.15, 0.05];

    //bolo de baunilha com recheio de morango
    //const cMassa = [0.94,0.90,0.55]; // baunilha
    //const cRecheio = [1.0, 0.7, 0.9]; // Recheio rosado/vermelho (morango)
    //const cCobertura = [1.0, 0.5, 0.8]; // cobertura rosa brilhante
    //const cBombom = [1.0, 0.6, 0.9];


    // Camadas do bolo (Quadrado com cantos arredondados)
    const layers = [
        // Base (Massa escura)
        { sx: width, sy: 0.17, sz: depth, y: 5.5, c: cMassa, bevel: 0.02 },
        // Recheio
        { sx: width - 0.01, sy: 0.5, sz: depth - 0.01, y: 1.5, c: cRecheio, bevel: 0.02 },
        // camada 2 (Massa escura)
        { sx: width, sy: 0.22, sz: depth, y: 2.5, c: cMassa, bevel: 0.02 },
        // Recheio
        { sx: width - 0.01, sy: 0.5, sz: depth - 0.01, y: 1.0, c: cRecheio, bevel: 0.02 },
        // Topo (Massa escura)
        { sx: width, sy: 0.25, sz: depth, y: 0.7, c: cMassa, bevel: 0.02 },


        // Cobertura grossa escorrendo (Simulada como um bloco um pouco maior no topo)
        // Chanfro maior para parecer líquido
        { sx: width + 0.05, sy: 0.14, sz: depth + 0.05, y: 7.6, c: cCobertura, bevel: 0.02 },
        { sx: 0.25, sy: 0.15, sz: 0.35, y: 8.0, c: cBombom, bevel: 0.25 }
    ];

    for (let l of layers) {
        let m = m4.identity();
        m = m4.translate(m, 0, l.y, 0);
        m = m4.scale(m, l.sx, l.sy, l.sz);

        const baked = bakeBeveledCube(m, l.c, l.bevel);

        allPos.push(...baked.positions);
        allNor.push(...baked.normals);
        allCol.push(...baked.colors);
    }

    const result = {
        positions: new Float32Array(allPos),
        normals: new Float32Array(allNor),
        colors: new Float32Array(allCol),
        vertexCount: allPos.length / 3
    };

    return result;
}

function main() {
    const canvas = document.getElementById('glCanvas');
    const gl = canvas.getContext('webgl');
    if (!gl) return;

    const program = createProgram(gl,
        createShader(gl, gl.VERTEX_SHADER, vertexShaderSource),
        createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)
    );
    gl.useProgram(program);

    const cakeData = createCakeMesh();

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cakeData.positions, gl.STATIC_DRAW);

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cakeData.normals, gl.STATIC_DRAW);

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cakeData.colors, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, 'a_position');
    const normLoc = gl.getAttribLocation(program, 'a_normal');
    const colLoc = gl.getAttribLocation(program, 'a_color');

    const uModel = gl.getUniformLocation(program, 'u_modelViewMatrix');
    const uView = gl.getUniformLocation(program, 'u_viewingMatrix');
    const uProj = gl.getUniformLocation(program, 'u_projectionMatrix');
    const uInvModel = gl.getUniformLocation(program, 'u_inverseTransposeModelViewMatrix');
    const uLight = gl.getUniformLocation(program, 'u_lightPosition');
    const uCam = gl.getUniformLocation(program, 'u_viewPosition');

    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(1.0, 0.71, 0.75, 1.0); // Rosa bebê -> aqui para mudar a cor do fundo na hora que gira

    let angle = 0;
    const aspect = canvas.width / canvas.height;
    const projectionMatrix = m4.setPerspectiveProjectionMatrix(-1.0 * aspect, 1.0 * aspect, -1.0, 1.0, -1.0, -20.0);

    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        //para manter girando
        angle += 0.02;

        const radius = 3.5;
        const camX = Math.sin(angle) * radius;
        const camZ = Math.cos(angle) * radius;
        const camY = 2.0;
        const P0 = [camX, camY, camZ];
        const Pref = [0, 0, 0];
        const V = [0, 0.5, 0];

        const viewMatrix = m4.setViewingMatrix(P0, Pref, V);

        let modelMatrix = m4.identity();
        modelMatrix = m4.translate(modelMatrix, 0, -1.0, 0);

        const invModel = m4.transpose(m4.inverse(modelMatrix));

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.enableVertexAttribArray(normLoc);
        gl.vertexAttribPointer(normLoc, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.enableVertexAttribArray(colLoc);
        gl.vertexAttribPointer(colLoc, 3, gl.FLOAT, false, 0, 0);

        gl.uniformMatrix4fv(uModel, false, modelMatrix);
        gl.uniformMatrix4fv(uView, false, viewMatrix);
        gl.uniformMatrix4fv(uProj, false, projectionMatrix);
        gl.uniformMatrix4fv(uInvModel, false, invModel);

        gl.uniform3fv(uLight, [5, 8, 5]);
        gl.uniform3fv(uCam, P0);

        gl.drawArrays(gl.TRIANGLES, 0, cakeData.vertexCount);

        requestAnimationFrame(render);
    }

    render();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}