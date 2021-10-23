const vs = `
varying vec2 vUv;
struct CamPos {
    float x;
    float y;
    float z;
};
struct CamInfo {
    float near;
    float far;
    CamPos position;
    mat4 projectionMatrixInverse;
    mat4 matrixWorldInverse;
};
uniform CamInfo camInfo;
// uniform sampler2D tDepth;

void main() {
    vUv = uv;
    gl_Position=projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

    // float fragCoordZ = texture2D(tDepth, vUv).r;
    // vec4 clipSpacePos = vec4(vUv.xy * 2. - 1., fragCoordZ * 2. - 1., 1.);
    // vec4 viewSpacePos = camInfo.projectionMatrixInverse * clipSpacePos;
    // viewSpacePos = viewSpacePos  / viewSpacePos.w;
    // worldPos = camInfo.matrixWorldInverse * viewSpacePos;
}
`;

const fs = `
#include <packing>
varying vec2 vUv;
uniform sampler2D intensityDepthMap;
uniform highp sampler2D tDepth;
struct CamPos {
    float x;
    float y;
    float z;
};
struct CamInfo {
    float near;
    float far;
    CamPos position;
    mat4 projectionMatrixInverse;
    mat4 matrixWorldInverse;
};
uniform CamInfo camInfo;

float readDepth(sampler2D depthSampler, vec2 coord) {
    float fragCoordZ = texture2D(depthSampler, coord).r;
    float viewZ = perspectiveDepthToViewZ(fragCoordZ, camInfo.near, camInfo.far);
    return viewZToOrthographicDepth(viewZ, camInfo.near, camInfo.far);
}

float linear01Depth(float near, float far, float depth) {
    float zParam1 = (1. - far / near) / 2.;
    float zParam2 = (1. + far / near) / 2.;
    return 1. / (zParam1 * depth + zParam2);
}

void main() {
    float fragCoordZ = texture2D(tDepth, vUv).r;
    vec4 clipSpacePos = vec4(vUv.xy * 2. - 1., fragCoordZ * 2. - 1., 1.);
    vec4 viewSpacePos = camInfo.projectionMatrixInverse * clipSpacePos;
    viewSpacePos = viewSpacePos  / viewSpacePos.w;
    vec4 worldPos = camInfo.matrixWorldInverse * viewSpacePos;

    // gl_FragColor = vec4(worldPos.xyz/1000., 1.);
    //gl_FragColor = vec4(viewSpacePos.xyz/500., 1.);

    // float fragCoordZ = texture2D(tDepth, vUv).r;
    vec2 ndcUV = vUv.xy * 2. - 1.;
    vec3 clipVec = vec3(ndcUV, 1.) * camInfo.far;
    vec3 viewVec = (camInfo.projectionMatrixInverse * clipVec.xyzz).xyz;
    vec3 viewPos = viewVec * linear01Depth(camInfo.near, camInfo.far, fragCoordZ);
    vec4 worldPos2 = camInfo.matrixWorldInverse * vec4(viewPos, 1.);
    // gl_FragColor = vec4(worldPos2.xyz/1000., 1.);

    gl_FragColor = vec4(viewSpacePos.xyz - viewPos.xyz, 1.);
}
`;

export default {
    uniforms: {
        intensityDepthMap: { value: null }
    },
    vertexShader: vs,
    fragmentShader: fs
};