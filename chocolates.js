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

    P0 = [0.0,4.0,1.0];
    Pref = [0.0,0.0,-5.0];
    V = [0.0,1.0,0.0];
    viewingMatrix = m4.setViewingMatrix(P0,Pref,V);
    
    let angulo = 0;

    function rotaciona_camera() {
        angulo += 0.02;

        const raio = 2.5;
        P0 = [raio * Math.sin(angulo), 0.0, raio * Math.cos(angulo)];

        viewingMatrix = m4.setViewingMatrix(P0, Pref, V);
        gl.uniformMatrix4fv(viewingMatrixUniformLocation, false, viewingMatrix);
    }

    function drawBombomChocolate() {
        gl.useProgram(program);

        //rotaciona_camera();


        const positionLocation = gl.getAttribLocation(program, 'a_position');
        const normalLocation = gl.getAttribLocation(program, 'a_normal');

        const colorUniformLocation = gl.getUniformLocation(program, 'u_color');

        const modelViewMatrixUniformLocation = gl.getUniformLocation(program, 'u_modelViewMatrix');
        const viewingMatrixUniformLocation = gl.getUniformLocation(program, 'u_viewingMatrix');
        const projectionMatrixUniformLocation = gl.getUniformLocation(program, 'u_projectionMatrix');
        const inverseTransposeModelViewMatrixUniformLocation = gl.getUniformLocation(program, `u_inverseTransposeModelViewMatrix`);

        const lightPositionUniformLocation = gl.getUniformLocation(program, 'u_lightPosition');
        const viewPositionUniformLocation = gl.getUniformLocation(program, 'u_viewPosition');

        const conicVertices = setSuperConicSphereVertices(2.0, 60, 20, 0.5, 0.8); // raio, slices, stacks, s1, s2
        const conicNormals = setSuperConicSphereNormals_flat(0.5, 10, 120, 1.5, 2.5);

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
        modelViewMatrix = m4.translate(modelViewMatrix, 0, -0.9, -3); //modelViewMatrix = m4.translate(modelViewMatrix, posicaoX, -0.8, posicaoZ); o troço desaparece

        inverseTransposeModelViewMatrix = m4.transpose(m4.inverse(modelViewMatrix));

        gl.uniformMatrix4fv(modelViewMatrixUniformLocation, false, modelViewMatrix);
        gl.uniformMatrix4fv(inverseTransposeModelViewMatrixUniformLocation, false, inverseTransposeModelViewMatrix);
        gl.uniformMatrix4fv(viewingMatrixUniformLocation, false, viewingMatrix);
        gl.uniformMatrix4fv(projectionMatrixUniformLocation, false, projectionMatrix);

        gl.uniform3fv(colorUniformLocation, new Float32Array([0.9, 0.0, 0.0]));
        gl.uniform3fv(viewPositionUniformLocation, new Float32Array(P0));
        gl.uniform3fv(lightPositionUniformLocation, new Float32Array([0.0, -0.5, -8]));

        gl.drawArrays(gl.TRIANGLES, 0, conicVertices.length / 3);
    
        //requestAnimationFrame(drawPochacco);
    }

    drawBombomChocolate();
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

function drawDoceLeite() {
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

        const conicVertices = setSuperConicSphereVertices(1.0, 40, 20, 0.5, 2);
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
        modelViewMatrix = m4.translate(modelViewMatrix, 0, -0.8, -10);

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

    function drawFruittella() {
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

        const conicVertices = setSuperConicSphereVertices(1.0, 60, 20, 0.5, 0.8);
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
        modelViewMatrix = m4.translate(modelViewMatrix, 0, -0.8, -10);

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