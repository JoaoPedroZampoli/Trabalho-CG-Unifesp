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
    gl.clearColor(1.0, 0.71, 0.76, 1.0);
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

    // ============================================
    // === LÓGICA DO PIRULITO (DENTRO DA MAIN) ===
    // ============================================

    // Variável para guardar o modelo do pirulito
    let pirulitoModel = {}; 

    // Função Parser (Agora interna)
    function parseOBJ_MultiPart(text) {
        const objPositions = [[0, 0, 0]];
        const objNormals = [[0, 0, 0]];
        const geometries = {}; 
        let currentObject = 'default';

        function ensureObject(name) {
            if (!geometries[name]) {
                geometries[name] = { positions: [], normals: [] };
            }
        }

        const lines = text.split('\n');
        for (let line of lines) {
            line = line.trim();
            if (line === '' || line.startsWith('#')) continue;
            
            const parts = line.split(/\s+/);
            const type = parts[0];

            if (type === 'v') {
                objPositions.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
            } 
            else if (type === 'vn') {
                objNormals.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
            } 
            else if (type === 'o' || type === 'g') {
                currentObject = parts[1] || 'unnamed';
                ensureObject(currentObject);
            }
            else if (type === 'f') {
                ensureObject(currentObject);
                const numVerts = parts.length - 1;
                for (let i = 0; i < numVerts - 2; ++i) {
                    const vertIndices = [parts[1], parts[2 + i], parts[3 + i]];
                    for (let v of vertIndices) {
                        const indices = v.split('/');
                        const vIndex = parseInt(indices[0]);
                        const nIndex = parseInt(indices[2]);

                        geometries[currentObject].positions.push(...objPositions[vIndex]);
                        
                        if (!isNaN(nIndex) && objNormals[nIndex]) {
                            geometries[currentObject].normals.push(...objNormals[nIndex]);
                        } else {
                            geometries[currentObject].normals.push(0, 1, 0);
                        }
                    }
                }
            }
        }
        return geometries;
    }

    // Função Loader (Agora interna, acessa 'gl' do escopo da main)
    async function loadPirulitoOBJ(url) {
        try {
            const response = await fetch(url);
            const text = await response.text();
            
            const rawData = parseOBJ_MultiPart(text);

            for (const [name, data] of Object.entries(rawData)) {
                if (data.positions.length === 0) continue;

                // Usa 'gl' do escopo pai (main)
                const pBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.positions), gl.STATIC_DRAW);

                const nBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.normals), gl.STATIC_DRAW);

                pirulitoModel[name] = {
                    positionBuffer: pBuffer,
                    normalBuffer: nBuffer,
                    count: data.positions.length / 3
                };
            }
            console.log("Pirulito carregado! Partes encontradas:", Object.keys(pirulitoModel));

        } catch (e) {
            console.error("Erro ao carregar Pirulito:", e);
        }
    }

    // Função Draw (Agora interna)
    function drawPirulito(posicaoX, posicaoZ) {
        // Verifica se carregou
        if (Object.keys(pirulitoModel).length === 0) return;

        gl.useProgram(program);

        const positionLocation = gl.getAttribLocation(program, 'a_position');
        const normalLocation = gl.getAttribLocation(program, 'a_normal');
        const colorUniformLocation = gl.getUniformLocation(program, 'u_color');

        const modelViewMatrixUniformLocation = gl.getUniformLocation(program, 'u_modelViewMatrix');
        const viewingMatrixUniformLocation = gl.getUniformLocation(program, 'u_viewingMatrix');
        const projectionMatrixUniformLocation = gl.getUniformLocation(program, 'u_projectionMatrix');
        const inverseTransposeModelViewMatrixUniformLocation = gl.getUniformLocation(program, 'u_inverseTransposeModelViewMatrix');
        const lightPositionUniformLocation = gl.getUniformLocation(program, 'u_lightPosition');
        const viewPositionUniformLocation = gl.getUniformLocation(program, 'u_viewPosition');

        // --- CONFIGURAÇÃO DE POSIÇÃO E ROTAÇÃO ---
        modelViewMatrix = m4.identity();

        // 1. ESCALA
        modelViewMatrix = m4.scale(modelViewMatrix, 0.5, 0.5, 0.5);

        // 2. CORREÇÃO "DEITADO" (Eixo X)
        modelViewMatrix = m4.xRotate(modelViewMatrix, degToRad(-90)); 

        // 3. CORREÇÃO "VIRADO PARA DIREITA" (Eixo Y)
        modelViewMatrix = m4.yRotate(modelViewMatrix, degToRad(0));

        modelViewMatrix = m4.zRotate(modelViewMatrix, degToRad(70));

        // 4. POSIÇÃO (Translação)
        let ajusteY = -1.5; 
        modelViewMatrix = m4.translate(modelViewMatrix, posicaoX, ajusteY, posicaoZ);
        
        inverseTransposeModelViewMatrix = m4.transpose(m4.inverse(modelViewMatrix));

        gl.uniformMatrix4fv(modelViewMatrixUniformLocation, false, modelViewMatrix);
        gl.uniformMatrix4fv(inverseTransposeModelViewMatrixUniformLocation, false, inverseTransposeModelViewMatrix);
        gl.uniformMatrix4fv(viewingMatrixUniformLocation, false, viewingMatrix);
        gl.uniformMatrix4fv(projectionMatrixUniformLocation, false, projectionMatrix);
        
        gl.uniform3fv(viewPositionUniformLocation, new Float32Array(P0));
        gl.uniform3fv(lightPositionUniformLocation, new Float32Array([2.0, 2.0, posZ + 3.0]));

        // --- LOOP DE DESENHO COM CORES ---
        for (const [partName, partData] of Object.entries(pirulitoModel)) {
            
            if (partName.includes('Cylinder') && !partName.includes('.')) {
                // Cabeça Principal
                gl.uniform3fv(colorUniformLocation, new Float32Array([1.0, 0.4, 0.7])); // Rosa
            } 
            else if (partName.includes('Cylinder.002')) {
                // Detalhe 1
                gl.uniform3fv(colorUniformLocation, new Float32Array([0.4, 0.8, 1.0])); // Azul Claro
            } 
            else if (partName.includes('Cylinder.004')) {
                // Detalhe 2
                gl.uniform3fv(colorUniformLocation, new Float32Array([1.0, 0.9, 0.4])); // Amarelo
            } 
            else {
                // O Palito
                gl.uniform3fv(colorUniformLocation, new Float32Array([1.0, 1.0, 1.0])); // Branco
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, partData.positionBuffer);
            gl.enableVertexAttribArray(positionLocation);
            gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, partData.normalBuffer);
            gl.enableVertexAttribArray(normalLocation);
            gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);

            gl.drawArrays(gl.TRIANGLES, 0, partData.count);
        }
    }

    // Carrega o pirulito (chamada dentro da main)
    loadPirulitoOBJ('Pista-Melody/newLolipop.obj');

    // ============================================

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
    let velZ = 0.55;  // velocidade para andar
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
        const types = ["brigadeiro", "morango", "bombom", "melao", "pirulito"];

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
            else if(o.type === "melao")
                drawSorveteMelao(o.x, o.z);
            else if (o.type === "pirulito") {
                drawPirulito(o.x, o.z);
            }
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

    // --- FUNÇÃO PARA DESENHAR A MELODY ---
    function drawMelody() {
        // 1. Física e Movimento (Baseado no jogo original)
        posZ -= velZ; // move para frente
        distPercorrida = Math.abs(posZ);
        
        andada += velAndada;

        // Atualiza pulo
        posY += velY;
        velY += gravity;

        if (posY <= 0) {
            posY = 0;
            velY = 0;
            isJumping = false;
        }

        let offsetX = posX;
        let offsetY = posY;

        // 2. Animação da Melody (Baseada no seu código de animação)
        
        // Oscilação dos membros
        let walkAngle = Math.sin(andada * 3) * 20; 
        
        // Efeito de pulo no corpo (bounce)
        const bodyBounce = Math.abs(Math.sin(andada * 3)) * 0.05 + offsetY;

        // Váriaveis de rotação dos braços e pernas
        let armAngleZ = 0;
        let leftLimbAngle = walkAngle;
        let rightLimbAngle = -walkAngle;

        // Máquina de estados para os membros
        if (isJumping) {
            // No pulo: Braços para cima
            armAngleZ = 200; 
            leftLimbAngle = 0; 
            rightLimbAngle = 0; 
        } 
        
        // Cores da Melody
        const rPink = 1.0, gPink = 0.6, bPink = 0.75;
        const rWhite = 1.0, gWhite = 1.0, bWhite = 1.0;
        const rBlack = 0.1, gBlack = 0.1, bBlack = 0.1;

        // Resetar rotações
        theta_x = 0; theta_y = 0; theta_z = 0;

        // Cabeça (Rosa)
        drawCube(1.0, rPink, gPink, bPink, 0 + offsetX, 0 + bodyBounce, 0 - posZ, 1, 1, 1);
        
        // Chapéu Topo
        drawCube(1.0, rPink, gPink, bPink, 0 + offsetX, 0.4 + bodyBounce, 0 - posZ, 1.05, 0.3, 1.05); 
        drawCube(1.0, rPink, gPink, bPink, 0.4 + offsetX, 0.3 + bodyBounce, 0 - posZ, 0.25, 0.35, 1.05); 
        drawCube(1.0, rPink, gPink, bPink, -0.4 + offsetX, 0.3 + bodyBounce, 0 - posZ, 0.25, 0.35, 1.05); 
        drawCube(1.0, rPink, gPink, bPink, -0.51 + offsetX, 0.0 + bodyBounce, 0 - posZ, 0.04, 1, 1.05); 
        drawCube(1.0, rPink, gPink, bPink, 0.51 + offsetX, 0.0 + bodyBounce, 0 - posZ, 0.04, 1, 1.05); 
        
        // Aba de trás
        theta_y = 90; 
        drawCube(1.0, rPink, gPink, bPink, 0.0 + offsetX, 0.0 + bodyBounce, -0.51 - posZ, 0.04, 1, 1.05); 
        theta_y = 0;

        // Laços
        const rL = 0.83, gL = 0.68, bL = 0.21;
        theta_z = 65; drawCube(0.22, rL, gL, bL, -0.15 + offsetX, 0.27 + bodyBounce, 0.5 - posZ, 1, 1.2, 1); 
        theta_z = 65; drawCube(0.22, rL, gL, bL, -0.42 + offsetX, 0.14 + bodyBounce, 0.5 - posZ, 1, 1.2, 1); 
        theta_z = -65; drawCube(0.14, 0.75, 0.65, 0.05, -0.28 + offsetX, 0.21 + bodyBounce, 0.6 - posZ, 1, 1.2, 1); 
        theta_z = -65; drawCube(0.07, 0.75, 0.65, 0.05, -0.409 + offsetX, 0.16 + bodyBounce, 0.6 - posZ, 1, 1.2, 1); 
        theta_z = -65; drawCube(0.07, 0.75, 0.65, 0.05, -0.165 + offsetX, 0.27 + bodyBounce, 0.6 - posZ, 1, 1.2, 1); 
        theta_z = 0;

        // Rosto
        drawCube(0.1, rBlack, gBlack, bBlack, -0.3 + offsetX, -0.1 + bodyBounce, 0.5 - posZ, 1, 2, 1); // olho esq
        drawCube(0.1, rBlack, gBlack, bBlack, 0.3 + offsetX, -0.1 + bodyBounce, 0.5 - posZ, 1.4, 0.5, 1); // olho dir
        drawCube(0.1, 1.0, 1.0, 0.0, 0.0 + offsetX, -0.2 + bodyBounce, 0.55 - posZ, 0.5, 0.5, 0.5); // fucinho
        drawCube(0.1, rBlack, gBlack, bBlack, 0.0 + offsetX, -0.35 + bodyBounce, 0.5 - posZ, 2, 0.5, 0.5); // boca
        drawCube(0.1, rBlack, gBlack, bBlack, 0.1 + offsetX, -0.32 + bodyBounce, 0.5 - posZ, 0.6, 0.6, 0.5); // boca 2

        // Orelhas
        theta_z = 0; drawCube(0.1, rPink, gPink, bPink, -0.40 + offsetX, 0.55 + bodyBounce, 0.0 - posZ, 1.9, 12.5, 2); 
        theta_x = 120; drawCube(0.1, rPink, gPink, bPink, -0.40 + offsetX, 1.0 + bodyBounce, 0.2 - posZ, 1.5, 6, 2); 
        theta_x = 0; 
        theta_z = 0; drawCube(0.1, rPink, gPink, bPink, 0.40 + offsetX, 0.55 + bodyBounce, 0.0 - posZ, 1.9, 16, 2); 
        theta_z = 0;

        // Corpo
        theta_y = 0;
        drawCube(1.0, rWhite, gWhite, bWhite, 0 + offsetX, -0.85 + bodyBounce, 0.05 - posZ, 0.8, 0.7, 0.65); 
        drawCube(0.1, rPink, gPink, bPink, 0.0 + offsetX, -0.52 + bodyBounce, 0 - posZ, 13, 0.5, 10); 

        // --- ANIMAÇÃO DOS MEMBROS ---

        // Braço Esquerdo
        if (isJumping) {
            theta_z = -armAngleZ; // Levanta (-200)
            theta_x = 0;
        } else {
            theta_z = 0;
            theta_x = -leftLimbAngle; 
        }
        drawCube(0.5, rWhite, gWhite, bWhite, -0.4 + offsetX, -0.70 + bodyBounce, 0 - posZ, 1.35, 0.5, 0.7);
        theta_z = 0; theta_x = 0;

        // Braço Direito
        if (isJumping) {
            theta_z = armAngleZ; // Levanta (200)
            theta_x = 0;
        } else {
            theta_z = 0;
            theta_x = -rightLimbAngle; 
        }
        drawCube(0.5, rWhite, gWhite, bWhite, 0.4 + offsetX, -0.70 + bodyBounce, 0 - posZ, 1.35, 0.5, 0.7);
        theta_z = 0; theta_x = 0;

        // Perna Esquerda
        theta_x = leftLimbAngle; 
        drawCube(0.5, rWhite, gWhite, bWhite, -0.22 + offsetX, -1.35 + bodyBounce, 0 - posZ, 0.70, 0.6, 0.7);
        theta_x = 0;

        // Perna Direita
        theta_x = rightLimbAngle; 
        drawCube(0.5, rWhite, gWhite, bWhite, 0.22 + offsetX, -1.35 + bodyBounce, 0 - posZ, 0.70, 1, 0.7);
        theta_x = 0;

        // Atualiza câmera
        P0 = [posX, 2.5 + posY, 3.5 + posZ];
        Pref = [posX, 0.0 + posY, -10.0 + posZ];
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
        
        gl.useProgram(programText); // <--- CORREÇÃO AQUI

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
        
        gl.useProgram(programText); // <--- CORREÇÃO AQUI

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
        
        gl.useProgram(programText); // <--- CORREÇÃO AQUI

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
    imageChao.src = "Pista-Melody/waffle.jpg";
    imageChao.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, textureChao);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imageChao);

        // Allow non-power-of-two textures correctly (NO MIPMAPS)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textureChao);
        
        gl.useProgram(programText); // <--- CORREÇÃO AQUI

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

        // --- ALTERAÇÃO AQUI ---
        // Calcula quantas vezes a textura repete baseada no comprimento (sz)
        // Dividir por 2 ou 3 ajuda a ajustar o tamanho do waffle visualmente
        let repeticao = sz / 2.0; 

        const texcoords = new Float32Array([
            // Frente, Esq, Tras, Dir (Não importam tanto pois estão achatados)
            1,1, 1,0, 0,1, 0,1, 1,0, 0,0, 
            0,1, 0,0, 1,1, 1,1, 0,0, 1,0, 
            0,1, 0,0, 1,1, 1,1, 0,0, 1,0, 
            1,1, 1,0, 0,1, 0,1, 1,0, 0,0, 

            // TOPO (Esta é a parte de cima do chão onde pisamos)
            // Substituímos '1' por 'repeticao' no eixo Y da textura
            1, repeticao,  1, 0,  0, repeticao, 
            0, repeticao,  1, 0,  0, 0, 

            // Fundo
            1,1, 1,0, 0,1, 0,1, 1,0, 0,0 
        ]);
        // ----------------------

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
            // Desenhar tela de Game Over
            document.getElementById('tela-gameover').style.display = "flex";
            return;
        }

        if(distPercorrida >= distVitoria && !vitoria) vitoria = true;

        if(vitoria) {
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

        drawMelody(); // Substituído aqui
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