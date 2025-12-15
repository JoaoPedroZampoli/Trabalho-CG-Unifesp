//pulo
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

    const aspecto = gl.canvas.width / gl.canvas.height;

    let xw_min = -1.0 * aspecto;
    let xw_max = 1.0 * aspecto;
    let yw_min = -1.0;
    let yw_max = 1.0;
    let z_near = -1.0;
    let z_far = -20.0;

    let projectionMatrix = m4.setPerspectiveProjectionMatrix(xw_min,xw_max,yw_min,yw_max,z_near,z_far);

    // para cubos
    let vertices = [];

    let theta_x = 0; let theta_y = 0; let theta_z = 0;

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
        modelViewMatrix = m4.translate(modelViewMatrix, add_x, add_y + 0.5, add_z); // +0.5 para deixar desenho mais para cima

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

    P0 = [0.0,0.0,2.0];
    Pref = [0.0,0.0,0.0];
    V = [0.0,1.0,0.0];
    viewingMatrix = m4.setViewingMatrix(P0,Pref,V);
    
    let angulo = 0;

    function rotaciona_camera() {
        angulo += 0.01;

        const raio = 2.5;
        P0 = [raio * Math.sin(angulo), 0.0, raio * Math.cos(angulo)];

        viewingMatrix = m4.setViewingMatrix(P0, Pref, V);
        gl.uniformMatrix4fv(viewingMatrixUniformLocation, false, viewingMatrix);
    }

    // Variável global para controlar o tempo da animação
let time = 0;

function drawMelody() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Limpar buffer 

    rotaciona_camera();
    
    // Animação 
    time += 0.30; // Velocidade da animação
    
    // Oscilação entre -1 e 1 baseada no tempo
    // Multiplicamos por 20 para ter uma amplitude de 20 graus
    let walkCycle = Math.sin(time) * 20; 
    
    // Ângulos para pernas e braços (fases opostas)
    let leftLimbAngle = walkCycle;
    let rightLimbAngle = -walkCycle;
    // --------------------------

    // Desenho Estático (Cabeça e Corpo)
    theta_x = 0; theta_y = 0; theta_z = 0; // Resetar rotações bases
    
    drawCube(1.0, 1.0, 1.0, 1.0, 0, 0, 0, 1, 1, 1); // cabeça
    drawCube(1.0, 1.5, 1.2, 1.8, 0, 0.4, 0, 1.05, 0.3, 1.05); // chapéu topo
    drawCube(1.0, 1.5, 1.2, 1.8, 0.4, 0.3, 0, 0.25, 0.35, 1.05); 
    drawCube(1.0, 1.5, 1.2, 1.8, -0.4, 0.3, 0, 0.25, 0.35, 1.05); 
    drawCube(1.0, 1.5, 1.2, 1.8, -0.51, 0.0, 0, 0.04, 1, 1.05); 
    drawCube(1.0, 1.5, 1.2, 1.8, 0.51, 0.0, 0, 0.04, 1, 1.05); 
    
    theta_y = 90; drawCube(1.0, 1.5, 1.2, 1.9, 0.0, 0.0, -0.51, 0.04, 1, 1.05); // aba trás
    theta_y = 0;

    // Laços
    theta_z = 65; drawCube(0.22, 0.83,  0.68    ,0.21, -0.15, 0.27, 0.5, 1, 1.2, 1); 
    theta_z = 65; drawCube(0.22, 0.83,  0.68    ,0.21, -0.42, 0.14, 0.5, 1, 1.2, 1); 
    theta_z = -65; drawCube(0.14, 0.75, 0.65, 0.05, -0.28, 0.21, 0.6, 1, 1.2, 1); 
    theta_z = -65; drawCube(0.07, 0.75, 0.65, 0.05, -0.409, 0.16, 0.6, 1, 1.2, 1); 
    theta_z = -65; drawCube(0.07, 0.75, 0.65, 0.05, -0.165, 0.27, 0.6, 1, 1.2, 1); 
    theta_z = 0;

    // Rosto
    drawCube(0.1, 0.0, 0.0, 0.0, -0.3, -0.1, 0.5, 1, 2, 1); // olho esq
    drawCube(0.1, 0.0, 0.0, 0.0, 0.3, -0.1, 0.5, 1.4, 0.5, 1); // olho dir
    drawCube(0.1, 1.0, 1.0, 0.0, 0.0, -0.2, 0.55, 0.5, 0.5, 0.5); // fucinho
    drawCube(0.1, 0.0, 0.0, 0.0, 0.0, -0.35, 0.5, 2, 0.5, 0.5); // boca
    drawCube(0.1, 0.0, 0.0, 0.0, 0.1, -0.32, 0.5, 0.6, 0.6, 0.5); // boca 2

    // Orelhas
    theta_z = 0; drawCube(0.1, 1.5, 1.2, 1.8, -0.40, 0.55, 0.0, 1.9, 12.5, 2); 
    theta_x = 120; drawCube(0.1, 1.5, 1.2, 1.8, -0.40, 1.0, 0.2, 1.5, 6, 2); 
    theta_x = 0; 
    theta_z = 0; drawCube(0.1, 1.5, 1.2, 1.8, 0.40, 0.55, 0.0, 1.9, 16, 2); 
    theta_z = 0;

    theta_y = 0;
    // Corpo
    drawCube(1.0, 1.0, 1.0, 1.0, 0, -0.85, 0.05, 0.8, 0.7, 0.65); 
    drawCube(0.1, 1.5, 1.2, 1.8, 0.0, -0.52, 0, 13, 0.5, 10); 

    // --- ANIMAÇÃO DOS MEMBROS ---

    // Braço Esquerdo (move oposto à perna esquerda, igual à perna direita)
    theta_z = -200; 
    drawCube(0.5, 1.0, 1.0, 1.0, -0.4, -0.70, 0, 1.35, 0.5, 0.7);
    
    // Braço Direito
    theta_z = 200;
    drawCube(0.5, 1.0, 1.0, 1.0, 0.4, -0.70, 0, 1.35, 0.5, 0.7);
    
    // Resetar rotação para evitar bugs
    theta_z = 0; 

    // Perna Esquerda
    //theta_x = leftLimbAngle;
    drawCube(0.5, 1.0, 1.0, 1.0, -0.22, -1.35, 0, 0.70, 0.6, 0.7);
    
    // Perna Direita
    //theta_x = rightLimbAngle;
    drawCube(0.5, 1.0, 1.0, 1.0, 0.22, -1.35, 0, 0.70, 1, 0.7);

    //theta_x = 0; // Reset final

    requestAnimationFrame(drawMelody);
}

    drawMelody();
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