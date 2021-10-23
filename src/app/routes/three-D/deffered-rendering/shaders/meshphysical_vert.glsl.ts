export const vshader = /* glsl */`
#define STANDARD

varying vec3 vViewPosition;

#ifndef FLAT_SHADED

	varying vec3 vNormal;

	#ifdef USE_TANGENT

		varying vec3 vTangent;
		varying vec3 vBitangent;

	#endif

#endif

#include <common>
#include <uv_pars_vertex>
#include <uv2_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

//uniform sampler2D posMap;
uniform sampler2D tDepth;
uniform sampler2D tNormal;
uniform sampler2D tObjNormal;
struct CamPos {
    float x;
    float y;
    float z;
};
struct CamInfo {
	float near;
	float far;
	mat4 projectionMatrixInverse;
    mat4 matrixWorldInverse;
	CamPos position;
};
uniform CamInfo camInfo;

#include <packing>

float linear01Depth(float near, float far, float depth) {
    float zParam1 = (1. - far / near) / 2.;
    float zParam2 = (1. + far / near) / 2.;
    return 1. / (zParam1 * depth + zParam2);
}

vec4 depthToViewPos2(CamInfo _camInfo, float depth, vec2 coord) {
    vec2 ndcUV = vUv.xy * 2. - 1.;
    vec3 clipVec = vec3(ndcUV, 1.) * camInfo.far;
    vec3 viewVec = (camInfo.projectionMatrixInverse * clipVec.xyzz).xyz;
    vec3 viewPos = viewVec * linear01Depth(_camInfo.near, _camInfo.far, depth);
    // vec4 worldPos2 = camInfo.matrixWorldInverse * vec4(viewPos, 1.);
    return vec4(viewPos, 1.);
}

void main() {

	#include <uv_vertex>
	#include <uv2_vertex>
	#include <color_vertex>

	#include <beginnormal_vertex>
	objectNormal = unpackRGBToNormal(texture2D(tObjNormal, vUv).rgb);
	
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	//#include <defaultnormal_vertex>
	
vec3 transformedNormal = objectNormal;

#ifdef USE_INSTANCING

	// this is in lieu of a per-instance normal-matrix
	// shear transforms in the instance matrix are not supported

	mat3 m = mat3( instanceMatrix );

	transformedNormal /= vec3( dot( m[ 0 ], m[ 0 ] ), dot( m[ 1 ], m[ 1 ] ), dot( m[ 2 ], m[ 2 ] ) );

	transformedNormal = m * transformedNormal;

#endif

//transformedNormal = normalMatrix * transformedNormal;
transformedNormal = unpackRGBToNormal(texture2D(tNormal, vUv).rgb);

#ifdef FLIP_SIDED

	transformedNormal = - transformedNormal;

#endif

#ifdef USE_TANGENT

	vec3 transformedTangent = ( modelViewMatrix * vec4( objectTangent, 0.0 ) ).xyz;

	#ifdef FLIP_SIDED

		transformedTangent = - transformedTangent;

	#endif

#endif

	

#ifndef FLAT_SHADED // Normal computed with derivatives when FLAT_SHADED

	vNormal = normalize( transformedNormal );

	#ifdef USE_TANGENT

		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );

	#endif

#endif

	#include <begin_vertex>

	
	float depth = texture2D(tDepth, vUv).r;
	// transformed = vec3(vUv.xy*2.-1., depth) * camInfo.far;

	// float viewZ = perspectiveDepthToViewZ(depth, camInfo.near, camInfo.far);
	// transformed = vec3((vUv.xy*2.-1.) * camInfo.far, viewZ);
	// transformed += vec3(camInfo.position.x, camInfo.position.y, camInfo.position.z);

	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	
	mvPosition = depthToViewPos2(camInfo, depth, vUv);
	vViewPosition = - mvPosition.xyz;

	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>

}
`;
