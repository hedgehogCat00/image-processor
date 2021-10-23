const vs = `
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position=projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`;

const fs = `
#include <packing>
varying vec2 vUv;
uniform sampler2D intensityDepthMap;
uniform sampler2D tDepth;
struct CamInfo {
    float near;
    float far;
};
uniform CamInfo camInfo;

float readDepth(sampler2D depthSampler, vec2 coord) {
    float fragCoordZ = texture2D(depthSampler, coord).r;
    float viewZ = perspectiveDepthToViewZ(fragCoordZ, camInfo.near, camInfo.far);
    return viewZToOrthographicDepth(viewZ, camInfo.near, camInfo.far);
}

// float readDepth2(sampler2D depthSampler, vec2 coord) {
//     float fragCoordZ = texture2D(depthSampler, coord).a;
//     float viewZ = perspectiveDepthToViewZ(fragCoordZ, camInfo.near, camInfo.far);
//     return viewZToOrthographicDepth(viewZ, camInfo.near, camInfo.far);
// }

void main() {
    // vec4 texel = texture2D(intensityDepthMap, vUv);
    // float depth = readDepth2(intensityDepthMap, vUv);
    float depth = readDepth(tDepth, vUv);
    gl_FragColor = vec4(1. - vec3(depth), 1.);
    // gl_FragColor = vec4( vec3(texel.rgb), 1.);
}
`;

export default {
    uniforms: {
        intensityDepthMap: { value: null }
    },
    vertexShader: vs,
    fragmentShader: fs
};