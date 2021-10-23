const vs = `
varying vec2 vUv;
varying vec4 vObjPos;

void main() {
    vUv = uv;
    vObjPos = modelViewMatrix * vec4( position, 1.0 );
    gl_Position=projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`;

const fs = `
#include <common>
#include <packing> 
varying vec2 vUv;
varying vec4 vObjPos;
uniform sampler2D tNormal;
uniform sampler2D tDepth;
uniform sampler2D tDiffuse;
uniform sampler2D tInvMvPos;
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

#if NUM_SPOT_LIGHTS > 0
struct SpotLight {
    vec3 position;
    vec3 direction;
    vec3 color;
    float distance;
    float decay;
    float coneCos;
    float penumbraCos;
};
uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
#endif

vec4 depthToViewPos(float depth, vec2 coord) {
    vec4 clipSpacePos = vec4(coord.xy * 2. - 1., depth * 2. - 1., 1.);
    vec4 viewSpacePos = camInfo.projectionMatrixInverse * clipSpacePos;
	viewSpacePos /= viewSpacePos.w;
	return viewSpacePos;
}

float linear01Depth(float near, float far, float depth) {
    float zParam1 = (1. - far / near) / 2.;
    float zParam2 = (1. + far / near) / 2.;
    return 1. / (zParam1 * depth + zParam2);
}

vec4 depthToViewPos2(CamInfo _camInfo, float depth, vec2 coord) {
    vec2 ndcUV = vUv.xy * 2. - 1.;
    // 反向透视除法
    vec3 clipVec = vec3(ndcUV, 1.) * camInfo.far;
    vec3 viewVec = (camInfo.projectionMatrixInverse * clipVec.xyzz).xyz;
    vec3 viewPos = viewVec * linear01Depth(_camInfo.near, _camInfo.far, depth);
    // vec4 worldPos2 = camInfo.matrixWorldInverse * vec4(viewPos, 1.);
    return vec4(viewPos, 1.);
}

vec4 zBufferToViewPos(CamInfo _camInfo, float zBuffer, vec2 coord) {
    vec2 ndcUV = vUv.xy * 2. - 1.;
    // vec4 ndc = vec4(ndcUV.xy, linear01Depth(_camInfo.near, _camInfo.far, zBuffer) * 2. - 1., 1.);
    vec4 ndc = vec4(ndcUV.xy, zBuffer, 1.);
    // 转到齐次坐标系
    vec4 homogenousPos = (_camInfo.projectionMatrixInverse * ndc);
    return vec4(homogenousPos.xyz / homogenousPos.w, 1.);
}

vec3 lambert(vec4 viewPos, vec3 vNormal) {
    vec3 resColor;
    vec3 lDir;
    vec3 lColorDiffuse;
    float dotNL;
    vec4 worldPos = camInfo.matrixWorldInverse * (viewPos);

    // 暂时都认为为点光源
    #if ( NUM_SPOT_LIGHTS > 0 )

        SpotLight pointLight;
        //pointLight.position = vec3(1., 1., 1.);

        #pragma unroll_loop_start
        for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {

            // pointLight = pointLights[ i ];
            pointLight = spotLights[ i ];

            lDir = normalize(pointLight.position - viewPos.xyz);
            // lDir = normalize(vec3(1., 1., 1.));
            dotNL = dot( vNormal, lDir );
            lColorDiffuse = PI * pointLight.color;

            // resColor += saturate( dotNL ) * lColorDiffuse;
            // resColor += saturate( abs(length(lDir)) / 5. ) * vec3(1.);
            resColor += saturate( abs(length(pointLight.position - viewPos.xyz)) / 2000. ) * vec3(1.);
        }
        #pragma unroll_loop_end

    #endif

    return resColor;
}

void main() {
    // float depth = texture2D(tDepth, vUv).r;
    float depth = texture2D(tNormal, vUv).a;

    // vec4 vPos = -depthToViewPos2(camInfo, depth, vUv);
    // vec3 invMVPos = texture2D(tInvMvPos, vUv).rgb;
    // vec4 vPos = vec4(1. / (invMVPos), 1.);
    // vec4 vPos = vec4(invMVPos.xyz, 1.);
    vec4 vPos = zBufferToViewPos(camInfo, depth, vUv);

    vec3 vNormal = unpackRGBToNormal(texture2D(tNormal, vUv).rgb);
    vec4 diffuse = texture2D(tDiffuse, vUv);

    vec3 lightColor = lambert(vPos, vNormal);
    // vec3 lightColor = lambert(vObjPos, vNormal);

    // gl_FragColor = diffuse + vec4(lightColor, 1.);
    gl_FragColor = vec4(lightColor, 1.);
    // gl_FragColor = vec4(vNormal, 1.);
    // gl_FragColor = vec4( vec3( linear01Depth(camInfo.near, camInfo.far, depth) ), 1.);

    // depth = perspectiveDepthToViewZ(depth, camInfo.near, camInfo.far);
    // depth = viewZToOrthographicDepth(depth, camInfo.near, camInfo.far);
    // gl_FragColor = vec4( vec3( depth ), 1.);
}
`;

export default {
    uniforms: {
        intensityDepthMap: { value: null }
    },
    vertexShader: vs,
    fragmentShader: fs
};