import * as THREE from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader';
import { ShadersDeffered } from '../shaders/deffered.shader';
import { Subject } from 'rxjs';

export enum ToneMappingType {
    NoOperator,
    SimpleOperator,
    LinearOperator,
    ReinhardOperator,
    FilmicOperator,
    UnchartedOperator
}

export interface MaterialEntry {
    material: any;
    normalDepth?: string;
    color?: string;
}

export interface DeferredMaterials {
    colorMaterial?: THREE.Material;
    normalDepthMaterial?: THREE.Material;
    transparent?: boolean;
}

export interface RTBuffer {
    buffer: Uint8Array;
    type: string;
    width: number;
    height: number;
}

export class WebGLDefferedRenderer {
    private renderer;
    private gl;
    private domElement;

    private scaledWidth: number;
    private scaledHeight: number;
    private fullWidth: number;
    private fullHeight: number;
    private currScale: number;

    private brightness: number;
    private tonemapping: ToneMappingType;
    private tonemappingDefinesMap = new Map([
        [ToneMappingType.SimpleOperator, { "TONEMAP_SIMPLE": true }],
        [ToneMappingType.LinearOperator, { "TONEMAP_LINEAR": true }],
        [ToneMappingType.ReinhardOperator, { "TONEMAP_REINHARD": true }],
        [ToneMappingType.FilmicOperator, { "TONEMAP_FILMIC": true }],
        [ToneMappingType.UnchartedOperator, { "TONEMAP_UNCHARTED": true }],
    ]);
    private antialias: boolean;

    // light proxy
    private lightSceneProxy;
    private lightSceneFullscreen;

    // 全局临时变量
    private currCamera;
    /**
     * 视空间坐标
     */
    private positionVS = new THREE.Vector3();
    private fullScreenCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // passes
    private passColor;
    private passNormalDepth;
    private passLightProxy;
    private passLightFullscreen;
    private passComposite;

    private compNormalDepth;
    private compColor;
    private compLight;
    private compFinal;

    private effectFXAA;

    private projMatrixInv = new THREE.Matrix4();

    private resizableMaterials: MaterialEntry[] = [];

    private geoLightSphere = new THREE.SphereGeometry(1, 16, 8);
    private geoLightPlane = new THREE.PlaneGeometry(2, 2);
    private invisibleMaterial = new THREE.ShaderMaterial();
    private black = new THREE.Color(0x000000);
    private defaultNormalDepthMaterial: THREE.ShaderMaterial;

    rtPixels$ = new Subject<RTBuffer>();


    constructor(parameters) {
        this.fullWidth = this.ensure(parameters.width, 800);
        this.fullHeight = this.ensure(parameters.height, 600);
        this.currScale = this.ensure(parameters.scale, 1);

        this.scaledWidth = Math.floor(this.currScale * this.fullWidth);
        this.scaledHeight = Math.floor(this.currScale * this.fullHeight);

        this.brightness = this.ensure(parameters.brightness, 1);
        this.tonemapping = this.ensure(parameters.tonemapping, ToneMappingType.SimpleOperator);
        this.antialias = this.ensure(parameters.antialias, true);

        this.renderer = parameters.renderer;
        if (this.renderer === undefined) {
            this.renderer = new THREE.WebGLRenderer({ antialias: false });
            this.renderer.setSize(this.fullWidth, this.fullHeight);
            this.renderer.setClearColor(0x000000, 0);
            this.renderer.autoClear = false;
        }

        this.domElement = this.renderer.domElement;

        this.gl = this.renderer.getContext();

        this.initGlobalMaterials();

        this.createRenderTargets();
    }

    private initGlobalMaterials() {
        this.invisibleMaterial.visible = false;

        const normalDepthShader = ShadersDeffered.normalDepth;
        this.defaultNormalDepthMaterial = new THREE.ShaderMaterial({
            uniforms: THREE.UniformsUtils.clone(normalDepthShader.uniforms),
            vertexShader: normalDepthShader.vertexShader,
            fragmentShader: normalDepthShader.fragmentShader,
            blending: THREE.NoBlending
        });
    }

    private ensure(value, defaultVal) {
        return value === undefined ? defaultVal : value;
    }

    private updatePositionVS(matrixWorld: THREE.Matrix4) {
        this.positionVS.setFromMatrixPosition(matrixWorld);
        this.positionVS.applyMatrix4(this.currCamera.matrixWorldInverse);
    }

    /**
     * 更新 lightIntensity，lightColor
     * @param light 
     * @param uniforms 
     */
    private updateLightProxyBasicProps(light, uniforms) {
        // linear space colors
        const intensity = Math.pow(light.intensity, 2);

        uniforms["lightIntensity"].value = intensity;
        uniforms["lightColor"].value.copyGammaToLinear(light.color);
    }

    private createDeferredPointLight(light) {
        // setup light material
        const pointLightShader = ShadersDeffered.pointLight;
        const matLight = new THREE.ShaderMaterial({
            uniforms: THREE.UniformsUtils.clone(pointLightShader.uniforms),
            vertexShader: pointLightShader.vertexShader,
            fragmentShader: pointLightShader.fragmentShader,

            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true,

            side: THREE.BackSide
        });

        // infinite pointlights use full-screen quad proxy
        // regular pointlights use sphere proxy
        let geometry;
        if (light.distance > 0) {
            geometry = this.geoLightSphere;
        } else {
            geometry = this.geoLightPlane;

            matLight.depthTest = false;
            matLight.side = THREE.FrontSide;
        }

        matLight.uniforms['viewWidth'].value = this.scaledWidth;
        matLight.uniforms['viewHeight'].value = this.scaledHeight;

        matLight.uniforms['samplerColor'].value = this.compColor.renderTarget2.texture;
        matLight.uniforms['samplerNormalDepth'].value = this.compNormalDepth.renderTarget2.texture;

        // create light proxy mesh
        const meshLight = new THREE.Mesh(geometry, matLight);

        // keep reference for color and intensity updates
        meshLight.userData.oriLight = light;

        // keep reference for size reset
        this.resizableMaterials.push({ material: matLight });

        // sync proxy uniforms to the original light
        this.updatePointLightProxy(meshLight);
        return meshLight;
    }

    private updatePointLightProxy(lightProxy) {
        const light = lightProxy.userData.oriLight;
        const uniforms = lightProxy.material.uniforms;

        // skip infinite pointlights
        // right now you can't switch between infinite and finite pointlights
        // it's just too messy as they use different proxies
        const distance = light.distance;
        if (distance > 0) {
            lightProxy.scale.set(1, 1, 1).multiplyScalar(distance);
            uniforms['lightRadius'].value = distance;

            // 更新视图空间坐标
            this.updatePositionVS(light.matrixWorld);

            uniforms["lightPosVS"].value.copy(this.positionVS);

            // 代理同步灯光位置
            lightProxy.position.setFromMatrixPosition(light.matrixWorld);
        } else {
            uniforms["lightRadius"].value = Infinity;
        }

        this.updateLightProxyBasicProps(light, uniforms);
    }

    private createDeferredSpotLight(obj) {

    }

    private updateLightProxy(proxy) {
        const uniforms = proxy.material.uniforms;
        if (uniforms['matProjInverse']) {
            uniforms['matProjInverse'].value = this.projMatrixInv;
        }
        if (uniforms['matView']) {
            uniforms['matView'].value = this.currCamera.matrixWorldInverse;
        }

        const oriLight = proxy.userData.oriLight;
        if (oriLight) {
            proxy.visible = oriLight.visible;

            if (oriLight instanceof THREE.PointLight) {
                this.updatePointLightProxy(proxy);
            }
        }
    }

    private createDeferredEmissiveLight() {
        // setup light material
        const emissiveLightShader = ShadersDeffered.emissiveLight;
        const materialLight = new THREE.ShaderMaterial({
            uniforms: THREE.UniformsUtils.clone(emissiveLightShader.uniforms),
            vertexShader: emissiveLightShader.vertexShader,
            fragmentShader: emissiveLightShader.fragmentShader,
            depthTest: false,
            depthWrite: false,
            blending: THREE.NoBlending
        });

        materialLight.uniforms['viewWidth'].value = this.scaledWidth;
        materialLight.uniforms['viewHeight'].value = this.scaledHeight;
        materialLight.uniforms['samplerColor'].value = this.compColor.renderTarget2.texture;

        // create light proxy mesh
        const meshLight = new THREE.Mesh(this.geoLightPlane, materialLight);

        // keep reference for size reset
        this.resizableMaterials.push({ material: materialLight });

        return meshLight;
    }

    private initDeferredMaterials(obj) {
        // object.material instanceof THREE.MeshFaceMaterial
        if (Array.isArray(obj.material)) {
            const colorMaterials = [];
            const normalDepthMaterials = [];

            const materials = obj.material;
            for (let i = 0, len = materials.length; i < len; i++) {
                const deferredMaterials = this.createDeferredMaterials(materials[i]);

                if (deferredMaterials.transparent) {
                    colorMaterials.push(this.invisibleMaterial);
                    normalDepthMaterials.push(this.invisibleMaterial);
                } else {
                    colorMaterials.push(deferredMaterials.colorMaterial);
                    normalDepthMaterials.push(deferredMaterials.normalDepthMaterial);
                }
            }

            Object.assign(obj.userData, {
                colorMaterial: colorMaterials,
                normalDepthMaterial: normalDepthMaterials,
            });
        } else {
            const deferredMaterials = this.createDeferredMaterials(obj.material);

            Object.assign(obj.userData, {
                colorMaterial: deferredMaterials.colorMaterial,
                normalDepthMaterial: deferredMaterials.normalDepthMaterial,
                transparent: deferredMaterials.transparent,
            });
        }

        obj.userData.oriMat = obj.material;
    }

    private createDeferredMaterials(oriMaterial): any {
        const deferredMaterials: DeferredMaterials = {};

        // color material
        // -----------------
        // 	diffuse color
        //	specular color
        //	shininess
        //	diffuse map
        //	vertex colors
        //	alphaTest
        // 	morphs
        const colorShader = ShadersDeffered.color;
        const uniforms = THREE.UniformsUtils.clone(colorShader.uniforms);
        const defines = {
            "USE_MAP": !!oriMaterial.map,
            "USE_ENVMAP": !!oriMaterial.envMap,
            "GAMMA_INPUT": true
        };

        const material = new THREE.ShaderMaterial({
            fragmentShader: colorShader.fragmentShader,
            vertexShader: colorShader.vertexShader,
            uniforms: uniforms,
            defines: defines,
            flatShading: oriMaterial.flatShading
        });

        let diffuse, emissive;
        if (oriMaterial instanceof THREE.MeshBasicMaterial) {
            diffuse = this.black;
            emissive = oriMaterial.color;
        } else {
            diffuse = oriMaterial.color;
            emissive = this.ensure(oriMaterial.emissive, this.black);
        }

        const specular = this.ensure(oriMaterial.specular, this.black);
        const shininess = this.ensure(oriMaterial.shininess, 1);
        const wrapAround = this.ensure(oriMaterial.wrapAround, 1);
        const additiveSpecular = this.ensure(oriMaterial.metal, -1);

        uniforms.emissive.value.copyGammaToLinear(emissive);
        uniforms.diffuse.value.copyGammaToLinear(diffuse);
        uniforms.specular.value.copyGammaToLinear(specular);
        uniforms.shininess.value = shininess;
        uniforms.wrapAround.value = wrapAround;
        uniforms.additiveSpecular.value = additiveSpecular;
        uniforms.aoMapIntensity.value = this.ensure(oriMaterial.aoMapIntensity, 1);


        uniforms.map.value = oriMaterial.map;

        if (oriMaterial.envMap) {
            uniforms.envMap.value = oriMaterial.envMap;
            uniforms.useRefract.value = oriMaterial.envMap.mapping instanceof THREE.CubeRefractionMapping;
            uniforms.refractionRatio.value = oriMaterial.refractionRatio;
            uniforms.combine.value = oriMaterial.combine;
            uniforms.reflectivity.value = oriMaterial.reflectivity;
            uniforms.flipEnvMap.value = (oriMaterial.envMap instanceof THREE.WebGLRenderTargetCube) ? 1 : -1;

            uniforms.samplerNormalDepth.value = this.compNormalDepth.renderTarget2;
            uniforms.viewWidth.value = this.scaledWidth;
            uniforms.viewHeight.value = this.scaledHeight;

            this.resizableMaterials.push({ "material": material });
        }

        material.vertexColors = oriMaterial.vertexColors;
        material.morphTargets = oriMaterial.morphTargets;
        material.morphNormals = oriMaterial.morphNormals;
        material.skinning = oriMaterial.skinning;

        material.alphaTest = oriMaterial.alphaTest;
        material.wireframe = oriMaterial.wireframe;

        // uv repeat and offset setting priorities
        //	1. color map
        //	2. specular map
        //	3. normal map
        //	4. bump map
        let uvScaleMap;
        ['map', 'normalMap', 'bumpMap'].some(mapName => {
            if (oriMaterial[mapName]) {
                uvScaleMap = oriMaterial[mapName];
            }
            return Boolean(oriMaterial[mapName]);
        });

        if (uvScaleMap !== undefined) {
            const offset = uvScaleMap.offset;
            const repeat = uvScaleMap.repeat;

            uniforms.offsetRepeat.value.set(offset.x, offset.y, repeat.x, repeat.y);
        }

        deferredMaterials.colorMaterial = material;

        // normal + depth material
        // -----------------
        //	vertex normals
        //	morph normals
        //	bump map
        //	bump scale
        //  clip depth
        let normalDepthMaterial;
        const normalDepthShader = ShadersDeffered.normalDepth;
        if (oriMaterial.morphTargets || oriMaterial.skinning || oriMaterial.bumpMap) {
            const uniforms = THREE.UniformsUtils.clone(normalDepthShader.uniforms);
            const defines = { "USE_BUMPMAP": !!oriMaterial.bumpMap };

            normalDepthMaterial = new THREE.ShaderMaterial({
                uniforms: uniforms,
                vertexShader: normalDepthShader.vertexShader,
                fragmentShader: normalDepthShader.fragmentShader,
                flatShading: oriMaterial.flatShading,
                defines: defines,
                blending: THREE.NoBlending
            });

            Object.assign(normalDepthMaterial, {
                morphTargets: oriMaterial.morphTargets,
                morphNormals: oriMaterial.morphNormals,
                skinning: oriMaterial.skinning,
            });

            if (oriMaterial.bumpMap) {
                uniforms.bumpMap.value = oriMaterial.bumpMap;
                uniforms.bumpScale.value = oriMaterial.bumpScale;

                var offset = oriMaterial.bumpMap.offset;
                var repeat = oriMaterial.bumpMap.repeat;

                uniforms.offsetRepeat.value.set(offset.x, offset.y, repeat.x, repeat.y);
            }
        } else {
            normalDepthMaterial = this.defaultNormalDepthMaterial.clone();
        }
        normalDepthMaterial.wireframe = oriMaterial.wireframe;
        normalDepthMaterial.vertexColors = oriMaterial.vertexColors;

        deferredMaterials.normalDepthMaterial = normalDepthMaterial;

        // transparent
        deferredMaterials.transparent = oriMaterial.transparent;

        return deferredMaterials;
    }

    private initDeferredProperties(obj) {
        if (obj.userData.defferedInitialized) {
            return;
        }
        if (obj.material) {
            this.initDeferredMaterials(obj);
        }

        if (obj instanceof THREE.PointLight) {
            const proxy = this.createDeferredPointLight(obj);
            if (obj.distance > 0) {
                this.lightSceneProxy.add(proxy);
            } else {
                this.lightSceneFullscreen.add(proxy);
            }
        }
        // else if (obj instanceof THREE.SpotLight) {
        //     const proxy = this.createDeferredSpotLight(obj);
        //     this.lightSceneFullscreen.add(proxy);
        // }

        obj.userData.defferedInitialized = true;
    }

    private setMaterialNormalDepth(obj) {
        if (obj.material) {
            if (obj.userData.transparent) {
                obj.material = this.invisibleMaterial;
            } else {
                obj.material = obj.userData.normalDepthMaterial;
            }
        }
    }

    private setMaterialColor(obj) {
        if (obj.material) {
            if (obj.userData.transparent) {
                obj.material = this.invisibleMaterial;
            } else {
                obj.material = obj.userData.colorMaterial;
            }
        }
    }

    private emitRenderTarget(rt, rtType: string) {
        setTimeout(() => {
            const buffer = new Uint8Array(this.scaledWidth * this.scaledHeight * 4);
            const gl = this.renderer.getContext();
            gl.readPixels(0, 0, this.scaledWidth, this.scaledHeight, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
            // this.renderer.readRenderTargetPixels(rt, 0, 0, this.scaledWidth, this.scaledHeight, buffer);
            this.rtPixels$.next({
                type: rtType,
                buffer: buffer,
                width: this.scaledWidth,
                height: this.scaledHeight
            });
        }, 1);
    }

    private createRenderTargets() {
        const rtParamsFloatLinear = {
            minFilter: THREE.NearestFilter, magFilter: THREE.LinearFilter, stencilBuffer: true,
            format: THREE.RGBAFormat, type: THREE.FloatType
        };

        const rtParamsFloatNearest = {
            minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, stencilBuffer: true,
            format: THREE.RGBAFormat, type: THREE.FloatType
        };

        const rtParamsUByte = {
            minFilter: THREE.NearestFilter, magFilter: THREE.LinearFilter, stencilBuffer: false,
            format: THREE.RGBFormat, type: THREE.UnsignedByteType
        };

        const rtColor = new THREE.WebGLRenderTarget(this.scaledWidth, this.scaledHeight, rtParamsFloatNearest);
        const rtNormalDepth = new THREE.WebGLRenderTarget(this.scaledWidth, this.scaledHeight, rtParamsFloatNearest);
        const rtLight = new THREE.WebGLRenderTarget(this.scaledWidth, this.scaledHeight, rtParamsFloatLinear);
        const rtFinal = new THREE.WebGLRenderTarget(this.scaledWidth, this.scaledHeight, rtParamsUByte);

        rtColor.texture.generateMipmaps = false;
        rtNormalDepth.texture.generateMipmaps = false;
        rtLight.texture.generateMipmaps = false;
        rtFinal.texture.generateMipmaps = false;

        // normal + depth composer
        this.passNormalDepth = new RenderPass();
        this.passNormalDepth.clear = true;

        this.compNormalDepth = new EffectComposer(this.renderer, rtNormalDepth);
        this.compNormalDepth.addPass(this.passNormalDepth);
        this.compNormalDepth.renderToScreen = false;

        // color composer
        this.passColor = new RenderPass();
        this.passColor.clear = true;

        this.compColor = new EffectComposer(this.renderer, rtColor);
        this.compColor.addPass(this.passColor);
        this.compColor.renderTarget2.shareDepthFrom = this.compNormalDepth.renderTarget2;
        this.compColor.renderToScreen = false;

        // light composer
        this.passLightFullscreen = new RenderPass();
        this.passLightFullscreen.clear = true;

        this.passLightProxy = new RenderPass();
        this.passLightProxy.clear = false;

        this.compLight = new EffectComposer(this.renderer, rtLight);
        this.compLight.addPass(this.passLightFullscreen);
        this.compLight.addPass(this.passLightProxy);
        this.compLight.renderTarget2.shareDepthFrom = this.compNormalDepth.renderTarget2;
        this.compLight.renderToScreen = true;

        // final composer
        // ShaderPass 会生成全屏渲染平面 Mesh
        this.passComposite = new ShaderPass(ShadersDeffered.composite);
        this.passComposite.uniforms['samplerLight'].value = this.compLight.renderTarget2.texture;
        this.passComposite.uniforms['brightness'].value = this.brightness;
        // this.passComposite.uniforms['viewWidth'].value = this.scaledWidth;
        // this.passComposite.uniforms['viewHeight'].value = this.scaledHeight;
        this.passComposite.material.blending = THREE.NoBlending;
        this.passComposite.clear = true;

        const defines = this.tonemappingDefinesMap.get(this.tonemapping);
        this.passComposite.material.defines = defines;

        // FXAA
        this.effectFXAA = new ShaderPass(FXAAShader);
        this.effectFXAA.uniforms['resolution'].value.set(1 / this.fullWidth, 1 / this.fullHeight);
        this.effectFXAA.renderToScreen = true;

        this.compFinal = new EffectComposer(this.renderer, rtFinal);
        this.compFinal.addPass(this.passComposite);
        this.compFinal.addPass(this.effectFXAA);

        this.setAntialias(this.antialias);
    }

    setScale(scale: number) {
        this.currScale = scale;

        this.scaledWidth = Math.floor(this.currScale * this.fullWidth);
        this.scaledHeight = Math.floor(this.currScale * this.fullHeight);

        [this.compNormalDepth, this.compColor, this.compLight, this.compFinal]
            .forEach(comp => comp.setSize(this.scaledWidth, this.scaledHeight));

        this.compColor.renderTarget2.shareDepthFrom = this.compNormalDepth.renderTarget2;
        this.compLight.renderTarget2.shareDepthFrom = this.compNormalDepth.renderTarget2;

        for (let i = 0, len = this.resizableMaterials.length; i < len; i++) {
            const materialEntry = this.resizableMaterials[i];

            const material = materialEntry.material;
            const uniforms = material.uniforms;

            const colorLabel = this.ensure(materialEntry.color, 'samplerColor');
            const normalDepthLabel = this.ensure(materialEntry.normalDepth, 'samplerNormalDepth');

            if (uniforms[colorLabel]) {
                uniforms[colorLabel].value = this.compColor.renderTarget2.texture;
            }
            if (uniforms[normalDepthLabel]) {
                uniforms[normalDepthLabel].value = this.compNormalDepth.renderTarget2.texture;
            }

            if (uniforms['viewWidth']) {
                uniforms['viewWidth'].value = this.scaledWidth;
            }
            if (uniforms['viewHeight']) {
                uniforms['viewHeight'].value = this.scaledHeight;
            }
        }

        this.passComposite.uniforms['samplerLight'].value = this.compLight.renderTarget2.texture;
        this.effectFXAA.uniforms['resolution'].value.set(1 / this.fullWidth, 1 / this.fullHeight);
    }

    setSize(width: number, height: number) {
        this.fullWidth = width;
        this.fullHeight = height;

        this.renderer.setSize(this.fullWidth, this.fullHeight);

        this.setScale(this.currScale);
    }

    setAntialias(enabled: boolean) {
        this.antialias = enabled;
        if (this.antialias) {
            this.effectFXAA.enabled = true;
            this.passComposite.renderToScreen = false;
        } else {
            this.effectFXAA.enabled = false;
            this.passComposite.renderToScreen = true;
        }
    }

    getAntialias() {
        return this.antialias;
    }

    addEffect(effect, normalDepthlabel: string, colorlabel: string) {
        if (effect.material && effect.uniforms) {
            if (normalDepthlabel) {
                effect.uniforms[normalDepthlabel].value = this.compNormalDepth.renderTarget2.texture;
            }
            if (colorlabel) {
                effect.uniforms[colorlabel].value = this.compColor.renderTarget2.texture;
            }

            if (normalDepthlabel || colorlabel) {
                this.resizableMaterials.push({
                    material: effect.material,
                    normalDepth: normalDepthlabel,
                    color: colorlabel
                });
            }

            this.compFinal.insertPass(effect, -1);
        }
    }

    render(scene, camera) {
        if (!scene.userData.lightSceneProxy) {
            scene.userData.lightSceneProxy = new THREE.Scene();
            scene.userData.lightSceneFullscreen = new THREE.Scene();

            const meshLight = this.createDeferredEmissiveLight();
            scene.userData.lightSceneFullscreen.add(meshLight);
        }

        this.currCamera = camera;

        this.lightSceneProxy = scene.userData.lightSceneProxy;
        this.lightSceneFullscreen = scene.userData.lightSceneFullscreen;

        this.passColor.camera = this.currCamera;
        this.passNormalDepth.camera = this.currCamera;
        this.passLightProxy.camera = this.currCamera;
        this.passLightFullscreen.camera = this.fullScreenCam;

        this.passColor.scene = scene;
        this.passNormalDepth.scene = scene;
        this.passLightProxy.scene = this.lightSceneProxy;
        this.passLightFullscreen.scene = this.lightSceneFullscreen;

        scene.traverse(this.initDeferredProperties.bind(this));

        const stencilBuffer = this.renderer.state.buffers.stencil;
        const depthBuffer = this.renderer.state.buffers.depth;

        // update scene graph only once per frame
        // (both color and normalDepth passes use exactly the same scene state)
        scene.autoUpdate = false;
        scene.updateMatrixWorld();

        // 1) g-buffer normals + depth pass
        scene.traverse(this.setMaterialNormalDepth.bind(this));

        // clear shared depth buffer
        this.renderer.autoClearDepth = true;
        this.renderer.autoClearStencil = true;

        // write 1 to shared stencil buffer
        // for non-background pixels
        // this.gl.stencilOp(this.gl.REPLACE, this.gl.REPLACE, this.gl.REPLACE);
        // // 永远通过
        // this.gl.stencilFunc(this.gl.ALWAYS, 1, 0xffffffff);
        // this.gl.clearStencil(0);
        stencilBuffer.setTest(true);
        stencilBuffer.setOp(this.gl.REPLACE, this.gl.REPLACE, this.gl.REPLACE);
        // 永远通过
        stencilBuffer.setFunc(this.gl.ALWAYS, 1, 0xffffffff);
        stencilBuffer.setClear(0);

        this.compNormalDepth.render();
        // this.emitRenderTarget(this.compNormalDepth.renderTarget2, 'compLight');

        // return;

        // just touch foreground pixels (stencil == 1)
        // both in color and light passes
        // this.gl.stencilFunc(this.gl.EQUAL, 1, 0xffffffff);
        // this.gl.stencilOp(this.gl.KEEP, this.gl.KEEP, this.gl.KEEP);
        stencilBuffer.setFunc(this.gl.EQUAL, 1, 0xffffffff);
        stencilBuffer.setOp(this.gl.KEEP, this.gl.KEEP, this.gl.KEEP);

        // 2) g-buffer color pass

        scene.traverse(this.setMaterialColor.bind(this));

        // must use clean slate depth buffer
        // otherwise there are z-fighting glitches
        // not enough precision between two geometry passes
        // just to use EQUAL depth test
        this.renderer.autoClearDepth = true;
        this.renderer.autoClearStencil = false;

        this.compColor.render();

        // return

        // 3) light pass

        // do not clear depth buffer in this pass
        // depth from geometry pass is used for light culling
        // (write light proxy color pixel if behind scene pixel)
        this.renderer.autoClearDepth = false;

        scene.autoUpdate = true;

        this.gl.depthFunc(this.gl.GEQUAL);
        // this.gl.depthFunc(this.gl.LEQUAL);
        // depthBuffer.setFunc(THREE.GreaterEqualDepth);

        // 更新全局逆投影矩阵
        this.projMatrixInv.copy(this.currCamera.projectionMatrix).invert();

        // 更新 lightSceneProxy 内灯光
        for (let i = 0, len = this.lightSceneProxy.children.length; i < len; i++) {
            const proxy = this.lightSceneProxy.children[i];
            this.updateLightProxy(proxy);
        }

        // 更新 lightSceneFullscreen 内灯光
        for (let i = 0, len = this.lightSceneFullscreen.children.length; i < len; i++) {
            const proxy = this.lightSceneFullscreen.children[i];
            this.updateLightProxy(proxy);
        }

        this.compLight.render();
        // this.emitRenderTarget(this.compLight.renderTarget2, 'compLight');
        return;

        // 4) composite pass

        // return back to usual depth and stencil handling state
        this.renderer.autoClearDepth = true;
        this.renderer.autoClearStencil = true;
        // this.gl.depthFunc(this.gl.LEQUAL);
        // this.gl.disable(this.gl.STENCIL_TEST);
        depthBuffer.setFunc(THREE.LessEqualDepth);
        stencilBuffer.setTest(false);

        this.compFinal.render(.1);
    }
}