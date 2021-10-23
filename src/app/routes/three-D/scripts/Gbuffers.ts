import { ShaderMaterial, Vector3 } from 'three/build/three.module';

const normalDepthMat = new ShaderMaterial({
    name: 'normalIntensityMat',
    uniforms: {
        far: null
    },
    vertexShader: `
    varying vec3 vNormal;
    varying vec2 depthPack;
    varying vec4 clipPos;
    uniform float far;

    void main() {
        vNormal = normalMatrix * normal;
        vec4 mvPos = modelViewMatrix * vec4( position, 1.0 );
        gl_Position = projectionMatrix * mvPos;
        depthPack = mvPos.zw;
        clipPos = gl_Position;
    }
    `,
    fragmentShader: `
    varying vec3 vNormal;
    varying vec2 depthPack;
    varying vec4 clipPos;

    #include <packing>

    void main() {
        // float intensity = 1.0;
        // gl_FragColor = vec4(packNormalToRGB(mNormal), gl_FragCoord.z);

        vec3 normal = normalize( vNormal );
        gl_FragColor = vec4(normal * .5 + .5, clipPos.z / clipPos.w);
    }
    `
});
/**
 * 计算 normalMatrix 之前的法线
 */
const objNormalMat = new ShaderMaterial({
    name: 'normalIntensityMat',
    uniforms: {
        intensity: 0
    },
    vertexShader: `
    varying vec3 mNormal;

    void main() {
        mNormal = normal;
        vec4 mvPos = modelViewMatrix * vec4( position, 1.0 );
        gl_Position = projectionMatrix * mvPos;
    }
    `,
    fragmentShader: `
    varying vec3 mNormal;

    #include <packing>

    void main() {
        gl_FragColor = vec4(packNormalToRGB(mNormal), 0.);
    }
    `
});
const positionMat = new ShaderMaterial({
    name: 'positionMat',
    vertexShader: `
    varying vec4 mPos;
    varying vec4 mvPos;
    void main() {
        mvPos = modelViewMatrix * vec4( position, 1.0 );
        gl_Position = projectionMatrix * mvPos;
        mPos = modelMatrix * vec4( position, 1.0 );
        // mPos = position;
    }
    `,
    fragmentShader: `
    varying vec4 mvPos;
    void main() {
        // gl_FragColor = vec4(1. / mvPos);
        gl_FragColor = vec4(mvPos / mvPos.w);
    }
    `
});
const specMat = new ShaderMaterial({
    uniforms: {
        specPower: 1,
        specIntensity: 1
    },
    name: 'specMat',
    vertexShader: `
    void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
    `,
    fragmentShader: `
    uniform double specPower;
    uniform double specIntensity;
    void main() {
        gl_FragColor = vec4(specPower, specIntensity, 0.0, 0.0);
    }
    `
});
const diffuseMat = new ShaderMaterial({
    uniforms: {
        color: { value: new Vector3(1, 1, 1) }
    },
    name: 'diffuseMat',
    vertexShader: `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
    `,
    fragmentShader: `
    varying vec2 vUv;
    uniform vec3 color;
    uniform sampler2D map;

    void main() {
        gl_FragColor = vec4(color, 1.0);
        #ifdef USE_MAP
            gl_FragColor = texture2D(map, vUv);
        #endif
    }
    `
});
const occlusionRoughnessMetallicMat = new ShaderMaterial({
    name: 'occlusionRoughnessMetallicMat',
    uniforms: {},
    vertexShader: `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
    `,
    fragmentShader: `
    varying vec2 vUv;
    uniform float roughness;
    uniform float metalness;
    uniform sampler2D roughnessMap; 
    uniform sampler2D metalnessMap; 
    uniform sampler2D aoMap; 

    void main() {
        float m_ao = 1.;
        #ifdef USE_AOMAP
            vec4 texelAO = texture2D( aoMap, vUv );

            m_ao = texelAO.a;
        #endif

        float m_roughness = roughness;
        #ifdef USE_ROUGHNESSMAP
            vec4 texelRoughness = texture2D( roughnessMap, vUv );

            // reads channel G, compatible with a combined OcclusionRoughnessMetallic (RGB) texture
            m_roughness = texelRoughness.g;
        #endif

        float m_metalness = metalness;
        #ifdef USE_METALNESSMAP
            vec4 texelMetalness = texture2D( metalnessMap, vUv );

            m_metalness = texelMetalness.b;
        #endif

        gl_FragColor = vec4(m_ao, m_roughness, m_metalness, 1.);
    }
    `
});

export {
    normalDepthMat as normalIntensityMat,
    objNormalMat,
    positionMat,
    specMat,
    diffuseMat,
    occlusionRoughnessMetallicMat
};