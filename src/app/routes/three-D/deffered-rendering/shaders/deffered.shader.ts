import * as THREE from 'three'
const shaderChunk = {
    unpackFloat: () => `
    vec3 float_to_vec3( float data ) {

        vec3 uncompressed;
        uncompressed.x = fract( data );
        float zInt = floor( data / 255.0 );
        uncompressed.z = fract( zInt / 255.0 );
        uncompressed.y = fract( floor( data - ( zInt * 255.0 ) ) / 255.0 );
        return uncompressed;

    }
    `,
    packVec3ToFloat: () => `
    const float unit = 255.0/256.0;

    float vec3_to_float( vec3 data ) {

        highp float compressed = fract( data.x * unit ) + floor( data.y * unit * 255.0 ) + floor( data.z * unit * 255.0 ) * 255.0;
        return compressed;

    }
    `,
    computeVertexPositionVS: `
    vec2 texCoord = gl_FragCoord.xy / vec2( viewWidth, viewHeight );

    vec4 normalDepth = texture2D( samplerNormalDepth, texCoord );
    float z = normalDepth.w;

    if ( z == 0.0 ) discard;

    vec2 xy = texCoord * 2.0 - 1.0;

    vec4 vertexPositionProjected = vec4( xy, z, 1.0 );
    vec4 vertexPositionVS = matProjInverse * vertexPositionProjected;
    vertexPositionVS.xyz /= vertexPositionVS.w;
    vertexPositionVS.w = 1.0;
    `,
    computeNormal: `
    // vec3 normal = normalDepth.xyz * 2. - 1.;
    vec3 normal = float_to_vec3( normalDepth.x ) * 2. - 1.;
    vec3 clearcoatNormal = float_to_vec3( normalDepth.y );
    `,
    computeClearcoatNormal: `
    vec3 clearcoatNormal = float_to_vec3( normalDepth.y );
    `,
    unpackColorMap: (
        samplerColor = 'samplerColor',
        texCoord = 'texCoord'
    ) => `
    vec4 colorMap = texture2D( ${samplerColor}, ${texCoord} );

    vec3 albedo = float_to_vec3( abs( colorMap.x ) );
    vec3 specularColor = float_to_vec3( abs( colorMap.y ) );
    float shininess = abs( colorMap.z );
    float wrapAround = sign( colorMap.z );
    float additiveSpecular = sign( colorMap.y );

    // vec3 albedo = colorMap.rgb;
    // vec3 specularColor = vec3( 1., 1., 1. );
    // float shininess = .5;
    // float wrapAround = 1.;
    // float additiveSpecular = .5;
    `,
    computeDiffuse: (
        lightVector = 'lightVector'
    ) => `
    float dotProduct = dot( normal, ${lightVector} );
    float diffuseFull = max( dotProduct, 0.0 );

    vec3 diffuse;

    if ( wrapAround < 0.0 ) {

        // wrap around lighting

        float diffuseHalf = max( 0.5 * dotProduct + 0.5, 0.0 );

        const vec3 wrapRGB = vec3( 1.0, 1.0, 1.0 );
        diffuse = mix( vec3( diffuseFull ), vec3( diffuseHalf ), wrapRGB );

    } else {

        // simple lighting

        diffuse = vec3( diffuseFull );

    }`,
    computeSpecular: (
        lightVector = 'lightVector',
        vertexPositionVS = 'vertexPositionVS',
        diffuse = 'diffuse',
        normal = 'normal',
        specularColor = 'specularColor',
        shininess = 'shininess'
    ) => `
    vec3 halfVector = normalize( ${lightVector} - normalize( ${vertexPositionVS}.xyz ) );
    float dotNormalHalf = max( dot( ${normal}, halfVector ), 0.0 );

    // simple specular

    //vec3 specular = specularColor * max( pow( dotNormalHalf, shininess ), 0.0 ) * diffuse;

    // physically based specular

    float specularNormalization = ( ${shininess} + 2.0001 ) / 8.0;

    vec3 schlick = ${specularColor} + vec3( 1.0 - ${specularColor} ) * pow( 1.0 - dot( ${lightVector}, halfVector ), 5.0 );
    vec3 specular = schlick * max( pow( dotNormalHalf, ${shininess} ), 0.0 ) * ${diffuse} * specularNormalization;
    `,
    combine: (
        lightIntensity = 'lightIntensity',
        lightColor = 'lightColor'
    ) => `
    vec3 light = ${lightIntensity} * ${lightColor};
    gl_FragColor = vec4( light * ( albedo * diffuse + specular ), attenuation );
    // gl_FragColor = vec4(vec3( albedo ), 1.);
    `
};

export const ShadersDeffered = {
    color: {
        uniforms: THREE.UniformsUtils.merge([
            // THREE.UniformsLib['common'],
            // THREE.UniformsLib['fog'],
            // THREE.UniformsLib['shadowmap'],
            THREE.ShaderLib['physical'].uniforms,
            {
                emissive: { type: "c", value: new THREE.Color(0x000000) },
                specular: { type: "c", value: new THREE.Color(0x111111) },
                shininess: { type: "f", value: 30 },
                wrapAround: { type: "f", value: 1 },
                additiveSpecular: { type: "f", value: 1 },

                samplerNormalDepth: { type: "t", value: null },
                viewWidth: { type: "f", value: 800 },
                viewHeight: { type: "f", value: 600 }
            }
        ]),
        vertexShader: `
        #define STANDARD
        #define PHYSICAL

        varying vec3 vViewPosition;

        #ifndef FLAT_SHADED

            varying vec3 vNormal;

            #ifdef USE_TANGENT

                varying vec3 vTangent;
                varying vec3 vBitangent;

            #endif

        #endif

        ${THREE.ShaderChunk["common"]}
        ${THREE.ShaderChunk["uv_pars_vertex"]}
        ${THREE.ShaderChunk["uv2_pars_vertex"]}
        ${THREE.ShaderChunk["displacementmap_pars_vertex"]}
        ${THREE.ShaderChunk["color_pars_vertex"]}
        ${THREE.ShaderChunk["fog_pars_vertex"]}
        ${THREE.ShaderChunk['morphtarget_pars_vertex']}
        ${THREE.ShaderChunk['skinning_pars_vertex']}
        ${THREE.ShaderChunk['shadowmap_pars_vertex']}
        ${THREE.ShaderChunk['logdepthbuf_pars_vertex']}
        ${THREE.ShaderChunk['clipping_planes_pars_vertex']}
        
        #ifdef USE_ENVMAP
        varying vec3 vWorldPosition;
        #endif

        void main() {
            ${THREE.ShaderChunk['uv_vertex']}
            ${THREE.ShaderChunk['uv2_vertex']}
            ${THREE.ShaderChunk['color_vertex']}

            ${THREE.ShaderChunk['skinbase_vertex']}

            ${THREE.ShaderChunk['begin_vertex']}
            ${THREE.ShaderChunk['morphtarget_vertex']}
            ${THREE.ShaderChunk['skinning_vertex']}
            ${THREE.ShaderChunk['displacementmap_vertex']}
            ${THREE.ShaderChunk['project_vertex']}
            ${THREE.ShaderChunk['logdepthbuf_vertex']}
            ${THREE.ShaderChunk['clipping_planes_vertex']}

            vViewPosition = - mvPosition.xyz;

            ${THREE.ShaderChunk['worldpos_vertex']}
            ${THREE.ShaderChunk['shadowmap_vertex']}
            ${THREE.ShaderChunk['fog_vertex']}

            #ifdef USE_ENVMAP
            vWorldPosition = worldPosition.xyz;
            #endif
        }
        `,
        fragmentShader: `
        #define STANDARD
        #define PHYSICAL

        #ifdef PHYSICAL
            #define REFLECTIVITY
            #define CLEARCOAT
            #define TRANSMISSION
        #endif

        uniform vec3 diffuse;
        uniform vec3 emissive;
        uniform float roughness;
        uniform float metalness;
        uniform float opacity;
        // 后渲染参数
        uniform vec3 specular;
        uniform float shininess;
        uniform float wrapAround;
        uniform float additiveSpecular;

        #ifdef TRANSMISSION
            uniform float transmission;
        #endif

        #ifdef REFLECTIVITY
            uniform float reflectivity;
        #endif

        #ifdef CLEARCOAT
            uniform float clearcoat;
            uniform float clearcoatRoughness;
        #endif

        #ifdef USE_SHEEN
            uniform vec3 sheen;
        #endif

        varying vec3 vViewPosition;

        #ifndef FLAT_SHADED

            varying vec3 vNormal;

            #ifdef USE_TANGENT

                varying vec3 vTangent;
                varying vec3 vBitangent;

            #endif

        #endif

        ${THREE.ShaderChunk['common']}
        ${THREE.ShaderChunk['packing']}
        ${THREE.ShaderChunk['dithering_pars_fragment']}
        ${THREE.ShaderChunk['color_pars_fragment']}
        ${THREE.ShaderChunk['uv_pars_fragment']}
        ${THREE.ShaderChunk['uv2_pars_fragment']}
        ${THREE.ShaderChunk['map_pars_fragment']}
        ${THREE.ShaderChunk['alphamap_pars_fragment']}
        ${THREE.ShaderChunk['aomap_pars_fragment']}
        ${THREE.ShaderChunk['lightmap_pars_fragment']}
        ${THREE.ShaderChunk['emissivemap_pars_fragment']}
        ${THREE.ShaderChunk['transmissionmap_pars_fragment']}
        ${THREE.ShaderChunk['bsdfs']}
        ${THREE.ShaderChunk['cube_uv_reflection_fragment']}
        ${THREE.ShaderChunk['envmap_common_pars_fragment']}
        ${THREE.ShaderChunk['envmap_physical_pars_fragment']}

        uniform sampler2D samplerNormalDepth;
        uniform int combine;
        uniform float viewHeight;
        uniform float viewWidth;

        #ifdef USE_ENVMAP

            varying vec3 vWorldPosition;

            // uniform float reflectivity;
            // uniform samplerCube envMap;
            // uniform float flipEnvMap;
            // uniform int combine;

            // uniform bool useRefract;
            // uniform float refractionRatio;

            // uniform sampler2D samplerNormalDepth;
            // uniform float viewHeight;
            // uniform float viewWidth;

        #endif

        // threejs 原生 <lights_physical_pars_fragment>
        struct PhysicalMaterial {

            vec3 diffuseColor;
            float specularRoughness;
            vec3 specularColor;
        
        #ifdef CLEARCOAT
            float clearcoat;
            float clearcoatRoughness;
        #endif
        #ifdef USE_SHEEN
            vec3 sheenColor;
        #endif

        // threejs 原生 <lights_physical_pars_fragment>
        #define MAXIMUM_SPECULAR_COEFFICIENT 0.16
        #define DEFAULT_SPECULAR_COEFFICIENT 0.04
        
        };
        ${THREE.ShaderChunk['fog_pars_fragment']}
        ${THREE.ShaderChunk['shadowmap_pars_fragment']}
        ${THREE.ShaderChunk['clearcoat_pars_fragment']}
        ${THREE.ShaderChunk['roughnessmap_pars_fragment']}
        ${THREE.ShaderChunk['metalnessmap_pars_fragment']}
        ${THREE.ShaderChunk['clipping_planes_pars_fragment']}

        ${shaderChunk.packVec3ToFloat()}
        ${shaderChunk.unpackFloat()}

        void main() {
            // 裁减面先判断当前面着色是否可以抛弃
            ${THREE.ShaderChunk['clipping_planes_fragment']}

            const float opacity = 1.;
            vec4 diffuseColor = vec4( diffuse, opacity );
            ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
            //gl_FragColor = vec4( diffuse, opacity );

            vec3 totalEmissiveRadiance = emissive;

            #ifdef TRANSMISSION
                float totalTransmission = transmission;
            #endif

            ${THREE.ShaderChunk['map_fragment']}
            ${THREE.ShaderChunk['color_fragment']}
            ${THREE.ShaderChunk['alphamap_fragment']}
            ${THREE.ShaderChunk['alphatest_fragment']}
            ${THREE.ShaderChunk['roughnessmap_fragment']}
            ${THREE.ShaderChunk['metalnessmap_fragment']}
            ${THREE.ShaderChunk['emissivemap_fragment']}
            ${THREE.ShaderChunk['transmissionmap_fragment']}

            vec2 texCoord = gl_FragCoord.xy / vec2( viewWidth, viewHeight );
            vec4 normalDepth = texture2D( samplerNormalDepth, texCoord );

            #ifdef USE_ENVMAP
                // vec2 texCoord = gl_FragCoord.xy / vec2( viewWidth, viewHeight );
                // vec4 normalDepth = texture2D( samplerNormalDepth, texCoord );
                // vec3 normal = normalDepth.xyz * 2.0 - 1.0;
                ${shaderChunk.computeNormal}

                vec3 reflectVec;
                vec3 cameraToVertex = normalize( vWorldPosition - cameraPosition );
                #ifdef ENV_WORLDPOS
                    reflectVec = refract( cameraToVertex, normal, refractionRatio );
                #else
                    reflectVec = reflect( cameraToVertex, normal );
                #endif

                vec4 cubeColor;
                #ifdef DOUBLE_SIDED
                    float flipNormal = ( -1.0 + 2.0 * float( gl_FrontFacing ) );
                    cubeColor = textureCube( envMap, flipNormal * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
                #else
                    cubeColor = textureCube( envMap, vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
                #endif

                #ifdef GAMMA_INPUT
                    cubeColor.xyz *= cubeColor.xyz;
                #endif

                // 融混方式
                if ( combine == 1 ) {
                    diffuseColor.xyz = mix( diffuseColor.xyz, cubeColor.xyz, specularStrength * reflectivity );
                } else if(combine = 2) {
                    diffuseColor.xyz += cubeColor.xyz * specularStrength * reflectivity;
                } else {
                    diffuseColor.xyz = mix( diffuseColor.xyz, diffuseColor.xyz * cubeColor.xyz, specularStrength * reflectivity );
                }
            #endif

            // 暴露 PhysicalMaterial material 变量
            // 使用了 diffuseColor 变量
            // 计算 material.specularRoughness 需要用到 geometryNormal
            ${shaderChunk.computeNormal}
            vec3 geometryNormal = normal;
            ${THREE.ShaderChunk['lights_physical_fragment']}
            
            // 根据 material.specularRoughness 影响 reflectedLight
            ${THREE.ShaderChunk['aomap_fragment']}
            ${THREE.ShaderChunk['fog_fragment']}

            const float compressionScale = 0.999;

            float diffuseFloat = vec3_to_float( material.diffuseColor );
            float specColorFloat = vec3_to_float( material.specularColor );
            // diffuse & specular pack
            vec3 diffuseSpec = vec3( diffuseFloat, material.specularRoughness, specColorFloat );
            
            float _clearcoat;
            float _clearcoatRoughness;
            vec3 _sheenColor;

            #ifdef CLEARCOAT
                _clearcoat = material.clearcoat;
                _clearcoatRoughness = material.clearcoatRoughness;
            #endif
            #ifdef USE_SHEEN
                _sheenColor = material.sheenColor;
            #endif
            float sheenColorFloat = vec3_to_float( _sheenColor );
            // clearcoat & sheen pack
            vec3 clearcoatSheen = vec3( _clearcoat, _clearcoatRoughness, sheenColorFloat );

            // diffuse color
            gl_FragColor.x = vec3_to_float( compressionScale * material.diffuseColor );

            // specular color
            gl_FragColor.y = vec3_to_float( compressionScale * material.specularColor );

            // shininess
            gl_FragColor.z = 1. - material.specularRoughness;

            // emissive color
            #ifdef USE_COLOR
                gl_FragColor.w = vec3_to_float( compressionScale * emissive * material.diffuseColor * vColor );
            #else
                gl_FragColor.w = vec3_to_float( compressionScale * emissive * material.diffuseColor );
            #endif

            // gl_FragColor = vec4( material.diffuseColor - float_to_vec3(abs(gl_FragColor.x)) , 1. );
            // gl_FragColor = vec4( float_to_vec3(abs(gl_FragColor.x)) , 1. );
            // gl_FragColor = vec4( vec3(1.) , 1. );
        }
        `
    },
    normalDepth: {
        uniforms: {

            bumpMap: { type: "t", value: null },
            bumpScale: { type: "f", value: 1 },
            offsetRepeat: { type: "v4", value: new THREE.Vector4(0, 0, 1, 1) }

        },
        vertexShader: `
        #define STANDARD
        #ifndef FLAT_SHADED

            varying vec3 vNormal;

            #ifdef USE_TANGENT

                varying vec3 vTangent;
                varying vec3 vBitangent;

            #endif

        #endif

        // varying vec3 normalView;
        varying vec4 clipPos;
        varying vec3 vViewPosition;

        #ifdef USE_BUMPMAP
            // varying vec2 vUv;
            // varying vec3 vViewPosition;

            uniform vec4 offsetRepeat;
        #endif

        ${THREE.ShaderChunk['uv_pars_vertex']}
        ${THREE.ShaderChunk['uv2_pars_vertex']}

        // 形变动画
        ${THREE.ShaderChunk['morphtarget_pars_vertex']}
        ${THREE.ShaderChunk['skinning_pars_vertex']}
        ${THREE.ShaderChunk['logdepthbuf_pars_vertex']}
        ${THREE.ShaderChunk['clipping_planes_pars_vertex']}

        void main() {
            ${THREE.ShaderChunk['uv_vertex']}
            ${THREE.ShaderChunk['uv2_vertex']}

            ${THREE.ShaderChunk['beginnormal_vertex']}
            ${THREE.ShaderChunk['morphnormal_vertex']}
            ${THREE.ShaderChunk['skinbase_vertex']}
            ${THREE.ShaderChunk['skinnormal_vertex']}
            ${THREE.ShaderChunk['defaultnormal_vertex']}

            #ifndef FLAT_SHADED // Normal computed with derivatives when FLAT_SHADED

                vNormal = normalize( transformedNormal );

                #ifdef USE_TANGENT

                    vTangent = normalize( transformedTangent );
                    vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );

                #endif

            #endif

            ${THREE.ShaderChunk['begin_vertex']}
            ${THREE.ShaderChunk['morphtarget_vertex']}
            ${THREE.ShaderChunk['skinning_vertex']}
            ${THREE.ShaderChunk['project_vertex']}
            ${THREE.ShaderChunk['logdepthbuf_vertex']}
            ${THREE.ShaderChunk['clipping_planes_vertex']}

            vViewPosition = - mvPosition.xyz;
            clipPos = gl_Position;
        }
        `,
        fragmentShader: `
        #define STANDARD

        #ifdef USE_BUMPMAP
            #extension GL_OES_standard_derivatives : enable
        #endif

        ${THREE.ShaderChunk['common']}
        ${THREE.ShaderChunk['uv_pars_fragment']}
        ${THREE.ShaderChunk['uv2_pars_fragment']}
        varying vec3 vViewPosition;
        ${THREE.ShaderChunk['bumpmap_pars_fragment']}
        ${THREE.ShaderChunk['normalmap_pars_fragment']}
        ${THREE.ShaderChunk['logdepthbuf_pars_fragment']}
        ${THREE.ShaderChunk['clipping_planes_pars_fragment']}

        ${shaderChunk.packVec3ToFloat()}
        ${shaderChunk.unpackFloat()}

        #ifndef FLAT_SHADED

            varying vec3 vNormal;

            #ifdef USE_TANGENT

                varying vec3 vTangent;
                varying vec3 vBitangent;

            #endif

        #endif

        varying vec4 clipPos;

        void main() {
            ${THREE.ShaderChunk['clipping_planes_fragment']}

            ${THREE.ShaderChunk['normal_fragment_begin']}
            ${THREE.ShaderChunk['normal_fragment_maps']}
            ${THREE.ShaderChunk['clearcoat_normal_fragment_begin']}
            ${THREE.ShaderChunk['clearcoat_normal_fragment_maps']}

            float normalPack = vec3_to_float( normal * 0.5 + 0.5 );

            float clearcoatNormalPack;
            #ifdef CLEARCOAT
                clearcoatNormalPack = vec3_to_float( clearcoatNormal );
            #endif

            gl_FragColor.xyz = vec3( normalPack, clearcoatNormalPack, 0. );
            gl_FragColor.w = clipPos.z / clipPos.w;
            // gl_FragColor.rgb = vec3( 0.,0., clipPos.z / clipPos.w );
        }
        `
    },
    composite: {
        uniforms: {

            samplerLight: { type: "t", value: null },
            brightness: { type: "f", value: 1 },

            viewWidth: { type: "f", value: 800 },
            viewHeight: { type: "f", value: 600 }
        },
        vertexShader: `
        varying vec2 texCoord;

        void main() {
            vec4 pos = vec4( sign( position.xy ), 0.0, 1.0 );
            // texCoord = pos.xy * vec2( 0.5 ) + 0.5;
            texCoord = position.xy * vec2( 0.5 ) + 0.5;
            // gl_Position = pos;
            gl_Position = vec4( position.xy, 0., 1. );
        }
        `,
        fragmentShader: `
        varying vec2 texCoord;
        uniform sampler2D samplerLight;
        uniform float brightness;

        uniform float viewWidth;
        uniform float viewHeight;

        void main() {
            vec3 inColor = texture2D( samplerLight, texCoord ).rgb;
            vec3 ousamplerColor = inColor;

            gl_FragColor = vec4( ousamplerColor, 1. );

            // gl_FragColor = vec4( texCoord, 0., 1. );
        }
        `
    },
    pointLight: {
        uniforms: {
            samplerNormalDepth: { type: 't', value: null },
            samplerColor: { type: 't', value: null },
            matProjInverse: { type: 'm4', value: new THREE.Matrix4() },
            viewWidth: { type: 'f', value: 800 },
            viewHeight: { type: 'f', value: 600 },

            lightPosVS: { type: 'v3', value: new THREE.Vector3(0, 0, 0) },
            lightColor: { type: 'c', value: new THREE.Color(0x000000) },
            lightIntensity: { type: 'f', value: 1. },
            lightRadius: { type: 'f', value: 1. }
        },
        vertexShader: `
    void main() {
        vec4 mvPosition = modelViewMatrix * vec4( position, 1. );
        gl_Position = projectionMatrix * mvPosition;
    }
    `,
        _fragmentShader: `
    uniform sampler2D samplerColor;
    uniform sampler2D samplerNormalDepth;

    uniform float viewWidth;
    uniform float viewHeight;

    uniform vec3 lightColor;
    uniform float lightRadius;
    uniform float lightIntensity;
    uniform vec3 lightPosVS;

    uniform mat4 matProjInverse;

    ${shaderChunk.unpackFloat()}

    void main() {
        vec2 texCoord = gl_FragCoord.xy / vec2( viewWidth, viewHeight );
        vec4 normalDepth = texture2D( samplerNormalDepth, texCoord );

        float z = normalDepth.w;
        if( z == 0. ) { 
            discard; 
        }

        vec2 xy = texCoord.xy * 2. - 1.;

        vec4 vertexPosProjected = vec4( xy, z, 1. );
        vec4 vertexPosVS = matProjInverse * vertexPosProjected;
        vertexPosVS.xyz /= vertexPosVS.w;
        vertexPosVS.w = 1.;

        vec3 lightVec = lightPosVS - vertexPosVS.xyz;
        float distance = length( lightVec );

        if( distance > lightRadius ) { 
            discard; 
        }

        // 计算 normal
        //vec3 normal = float_to_vec3( normalDepth.x ) * 2. - 1.;
        ${shaderChunk.computeNormal}
        // 解包 color
        ${shaderChunk.unpackColorMap('samplerColor')}

        lightVec = normalize( lightVec );

        // 计算 diffuse
        ${shaderChunk.computeDiffuse('lightVec')}
        // 计算 specular
        ${shaderChunk.computeSpecular('lightVec', 'vertexPosVS')}

        // 集成
        float cutoff = 0.3;
        float denom = distance / lightRadius + 1.0;
        float attenuation = 1.0 / ( denom * denom );
        attenuation = ( attenuation - cutoff ) / ( 1.0 - cutoff );
        attenuation = max( attenuation, 0.0 );
        attenuation *= attenuation;

        ${shaderChunk.combine()}
    }
    `,
        fragmentShader: `
        uniform sampler2D samplerColor;
        uniform sampler2D samplerNormalDepth;

        uniform float viewWidth;
        uniform float viewHeight;

        uniform vec3 lightColor;
        uniform float lightRadius;
        uniform float lightIntensity;
        uniform vec3 lightPosVS;

        uniform mat4 matProjInverse;

        void main() {
            vec2 texCoord = gl_FragCoord.xy / vec2(viewWidth, viewHeight);
            // vec4 normalDepth = texture2D( samplerNormalDepth, texCoord );
            // gl_FragColor = vec4( vec3(.5), 1. );
            gl_FragColor = vec4( lightColor, 1. );
        }
        `
    },
    emissiveLight: {
        uniforms: {
            samplerColor: { type: "t", value: null },
            viewWidth: { type: "f", value: 800 },
            viewHeight: { type: "f", value: 600 },
        },
        vertexShader: `
        void main() { 
            // full screen quad proxy
            gl_Position = vec4( sign( position.xy ), 0.0, 1.0 );
        }
        `,
        fragmentShader: `
        uniform sampler2D samplerColor;

        uniform float viewHeight;
        uniform float viewWidth;

        ${shaderChunk.unpackFloat()}

        void main() {
            vec2 texCoord = gl_FragCoord.xy / vec2( viewWidth, viewHeight );

            vec4 colorMap = texture2D( samplerColor, texCoord );
            vec3 emissiveColor = float_to_vec3( abs( colorMap.w ) );

            gl_FragColor = vec4( emissiveColor, 1.0 );
        }
        `
    }
}