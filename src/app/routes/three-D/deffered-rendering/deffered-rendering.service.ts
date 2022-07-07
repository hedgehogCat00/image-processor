import { EventEmitter, Injectable } from '@angular/core';
import { fromEvent, Observable, Subject, zip } from 'rxjs';
import { delay } from 'rxjs/operators'
import { GlobalService } from 'src/app/global.service';
import * as THREE from 'three/build/three.module';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { FBXLoader } from '../scripts/FBXLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { SavePass } from 'three/examples/jsm/postprocessing/SavePass';
import { DepthPass } from './passes/depthPass.js';
import { FreePass } from './passes/freePass.js';
import {
  diffuseMat,
  normalIntensityMat,
  objNormalMat,
  occlusionRoughnessMetallicMat,
  positionMat
} from '../scripts/Gbuffers.js';
import { vshader } from './shaders/meshphysical_vert.glsl.js';
import { fshader } from './shaders/meshphysical_frag.glsl.js';
import { Pass } from 'three/examples/jsm/postprocessing/Pass';
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader';
import viewNormalDepthMapShader from './shaders/view-normal-depth-map.glsl';
import viewDepth2PosShader from './shaders/view-depth-2-pos.glsl.js';
import { CusWebGLRenderer } from '../scripts/CusWebGLRenderer';
import differedLambertGlsl from './shaders/differed-lamber.glsl.js';
import { ShadersDeffered } from './shaders/deffered.shader.js';
import { RTBuffer, WebGLDefferedRenderer } from './renderer/WebGLDefferedRenderer';
import Stats from 'three/examples/jsm/libs/stats.module';

@Injectable()
export class DefferedRenderingService {
  renderer: any;
  deferredRenderer: WebGLDefferedRenderer;
  forewardRenderer: THREE.WebGLRenderer;
  scene: any;
  camera: any;
  camCtrls: any;
  composer: any;
  composer2: any;
  testLambertMat: any;
  /**
   * 存储 normalMatrix 转换后的观察坐标系法线向量以深度
   */
  private normalDepthRT;
  /**
   * 存储 normalMatrix 转换前的物体坐标系法线向量
   */
  private objNormalRT;
  private positionRT;
  private specRT;
  private diffuseRT;
  private ORMRT;
  private depthColorRT;
  private rtLight;
  private rtFinal;

  private fsQuad;

  private lightSceneProxy;

  private screenWidth;
  private screenHeight;

  private compLight;
  private compFinal;

  private passLightProxy;
  private passComposite;

  private projMatInv;

  // private stats = new Stats();
  private stats = Stats();
  private pause = false;

  rtPixels$ = new Subject<RTBuffer>();

  constructor(
    private globalSrv: GlobalService
  ) { }

  init(canvas: HTMLCanvasElement) {
    this.scene = this.initScene(canvas);
    this.renderer = this.initRenderer(canvas);
    this.camera = this.initCamera(canvas);
    this.camCtrls = this.initCamControls(this.camera, canvas);

    this.scene.add(this.camera);

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;

    this.deferredRenderer = new WebGLDefferedRenderer({
      width,
      height,
      renderer: this.renderer,
      brightness: 1
    });
    this.renderer = this.forewardRenderer;

    this.rtPixels$ = this.deferredRenderer.rtPixels$;

    this.normalDepthRT = new THREE.WebGLRenderTarget(width, height, {
      depthTexture: new THREE.DepthTexture(width, height),
    });
    this.objNormalRT = new THREE.WebGLRenderTarget(width, height);
    this.positionRT = new THREE.WebGLRenderTarget(width, height);
    this.specRT = new THREE.WebGLRenderTarget(width, height);
    this.diffuseRT = new THREE.WebGLRenderTarget(width, height);
    this.ORMRT = new THREE.WebGLRenderTarget(width, height);
    this.depthColorRT = new THREE.WebGLRenderTarget(width, height);
    this.rtLight = new THREE.WebGLRenderTarget(width, height);
    this.rtFinal = new THREE.WebGLRenderTarget(width, height);

    const ambientLight = new THREE.AmbientLight(new THREE.Color("rgb(58, 94, 129)"));
    this.scene.add(ambientLight);

    // 添加随机点光源
    Array(30).fill(0).forEach(() => {
      this.scene.add(this.randomPointLight());
    });

    // this.composer = new EffectComposer(this.renderer);

    // this.fsQuad = new Pass.FullScreenQuad(null);
    // const shaderMat = new THREE.MeshStandardMaterial({
    //   roughnessMap: this.ORMRT.texture,
    //   metalnessMap: this.ORMRT.texture,
    //   aoMap: this.ORMRT.texture,
    //   map: this.diffuseRT.texture,
    //   normalMap: this.normalDepthRT.texture,
    // });
    // shaderMat.onBeforeCompile = shader => {
    //   Object.assign(shader, {
    //     vertexShader: vshader,
    //     fragmentShader: fshader
    //   });
    //   Object.assign(shader.uniforms, {
    //     posMap: { value: this.positionRT.texture },
    //     tDepth: { value: this.normalDepthRT.depthTexture },
    //     normalDepthMap: { value: this.normalDepthRT.texture },
    //     tObjNormal: { value: this.objNormalRT.texture },
    //     cameraInfo: { value: this.camera }
    //   });
    // }
    // // this.fsQuad.material = shaderMat;

    // // const copyShader = Object.assign({}, CopyShader);
    // // copyShader.uniforms.tDiffuse.value = this.positionRT.texture;
    // // this.fsQuad.material = new THREE.ShaderMaterial(copyShader);

    // // const viewDepthShaderMat = new THREE.ShaderMaterial(ViewNormalDepthMapShader);
    // // const viewDepthShaderMat = new THREE.ShaderMaterial(viewDepth2PosShader);
    // // viewDepthShaderMat.onBeforeCompile = shader => {
    // //   Object.assign(shader.uniforms, {
    // //     intensityDepthMap: {
    // //       value: this.normalDepthRT.texture
    // //     },
    // //     tDepth: {
    // //       value: this.normalDepthRT.depthTexture
    // //     },
    // //     camInfo: { value: this.camera }
    // //   })
    // // };
    // // this.fsQuad.material = viewDepthShaderMat;

    // const lambertMat = new THREE.ShaderMaterial(differedLambertGlsl);
    // lambertMat.onBeforeCompile = shader => {
    //   shader.uniforms = Object.assign({}, shader.uniforms, {
    //     tNormal: { value: this.normalDepthRT.texture },
    //     tDepth: { value: this.normalDepthRT.depthTexture },
    //     tDiffuse: { value: this.diffuseRT.texture },
    //     tInvMvPos: { value: this.positionRT.texture },
    //     camInfo: { value: this.camera },

    //     ambientLightColor: {},
    //     lightProbe: {},
    //     directionalLights: {},
    //     directionalLightShadows: {},
    //     spotLights: {},
    //     spotLightShadows: {},
    //     rectAreaLights: {},
    //     ltc_1: {},
    //     ltc_2: {},
    //     pointLights: {},
    //     pointLightShadows: {},
    //     hemisphereLights: {},

    //     directionalShadowMap: {},
    //     directionalShadowMatrix: {},
    //     spotShadowMap: {},
    //     spotShadowMatrix: {},
    //     pointShadowMap: {},
    //     pointShadowMatrix: {}
    //   });
    // };
    // lambertMat.lights = true;
    // this.fsQuad.material = lambertMat;
    // this.testLambertMat = lambertMat;

    // // const renderPass = new RenderPass(this.scene, this.camera);
    // // this.composer.addPass(renderPass);
    // // const glitchPass = new GlitchPass();
    // // this.composer.addPass(glitchPass);
    // // const depthPass = new DepthPass(canvas.offsetWidth, canvas.offsetHeight, this.scene, this.camera);
    // // this.composer.addPass(depthPass);
    // // this.composer.addPass(new SavePass(null));

    // this.composer2 = new EffectComposer(this.renderer);
    // // this.composer2.addPass(
    // //   new DepthPass(this.depthColorRT, width, height, this.scene, this.camera)
    // // );
    // this.composer2.addPass(
    //   new FreePass(this.diffuseRT, diffuseMat.clone(), this.scene, this.camera)
    // );
    // this.composer2.addPass(
    //   new FreePass(this.ORMRT, occlusionRoughnessMetallicMat.clone(), this.scene, this.camera)
    // );
    // this.composer2.addPass(
    //   new FreePass(this.normalDepthRT, normalIntensityMat.clone(), this.scene, this.camera)
    // );
    // this.composer2.addPass(
    //   new FreePass(this.objNormalRT, objNormalMat.clone(), this.scene, this.camera)
    // );
    // this.composer2.addPass(
    //   new FreePass(this.positionRT, positionMat.clone(), this.scene, this.camera)
    // );
    // // this.composer2.addPass(
    // //   new FreePass(null, shaderMat.clone(), this.scene, this.camera)
    // // );
    // // this.composer2.addPass(new SavePass(null));

    // this.passLightProxy = new RenderPass();
    // this.passLightProxy.clear = false;

    // this.compLight = new EffectComposer(this.renderer, this.rtLight);
    // this.compLight.addPass(this.passLightProxy);
    // this.compLight.renderTarget2.shareDepthFrom = this.normalDepthRT;

    // this.passComposite = new ShaderPass(ShadersDeffered.composite);
    // this.passComposite.uniforms['samplerLight'].value = this.compLight.renderTarget2.texture;
    // this.passComposite.material.blending = THREE.NoBlending;
    // this.passComposite.clear = true;
    // this.passComposite.renderToScreen = true;

    // this.compFinal = new EffectComposer(this.renderer, this.rtFinal);
    // this.compFinal.addPass(this.passComposite);

    // this.projMatInv = new THREE.Matrix4();

    this.animate();

    zip(
      fromEvent(window, 'resize'),
      this.globalSrv.layoutChangedEvt.pipe(delay(300))
    ).subscribe(() => {
      this.renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
      this.camera.aspect = canvas.offsetWidth / canvas.offsetHeight;

      this.deferredRenderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
    });

    document.body.appendChild(this.stats.dom);

    // navigator.mediaDevices.getDisplayMedia()
    //   .then(stream => {

    //   });
  }

  loadModel$(url: string) {
    return new Observable(subs => {
      const loader = new FBXLoader();
      loader.load(url, obj => {
        subs.next(obj);
      });
    });
  }

  setForwardRenderMode() {
    this.pause = true;

    if (this.scene) {
      this.scene.traverse(obj => {
        if (obj.userData.oriMat) {
          obj.material = obj.userData.oriMat;
        }
      });
    }

    this.renderer = this.forewardRenderer;
    this.pause = false;
  }

  setDefferedRenderMode() {
    this.pause = true;
    this.renderer = this.deferredRenderer;
    this.pause = false;
  }

  private initRenderer(canvas: HTMLCanvasElement) {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true
    });
    // const renderer = new CusWebGLRenderer({
    //   canvas,
    //   antialias: true
    // });

    renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);

    this.forewardRenderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true
    });
    this.forewardRenderer.setSize(canvas.offsetWidth, canvas.offsetHeight);

    return renderer;
  }

  private initScene(canvas: HTMLCanvasElement) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#adadad');
    return scene;
  }

  private initCamControls(camera: any, canvas: HTMLCanvasElement) {
    const controls = new OrbitControls(camera, canvas);
    return controls;
  }

  private initCamera(canvas: HTMLCanvasElement) {
    const camera = new THREE.PerspectiveCamera(75, canvas.offsetWidth / canvas.offsetHeight, 0.1, 10000);
    camera.position.set(0, 20, 100);
    return camera;
  }

  randomPointLight() {
    const light = new THREE.PointLight(new THREE.Color(Math.random(), Math.random(), Math.random()), 1, 50);
    const randomBetween = (min, max) => Math.random() * (max - min) + min;
    light.position.set(randomBetween(-50, 50), randomBetween(0, 10), randomBetween(-50, 50));
    return light;
  }

  private updateLightProxy(proxy) {
    const uniforms = proxy.material.uniforms;
    if (uniforms['matProjInv']) {
      uniforms['matProjInv'].value = this.projMatInv;
    }
    if (uniforms['matView']) {
      uniforms['matView'].value = this.camera.matrixWorldInverse;
    }

    const oriLight = proxy.userData.oriLight;
    if (oriLight) {
      proxy.visible = oriLight.visible;
      if (oriLight instanceof THREE.Light) {
        this.updatePointLightProxy(proxy);
      }
    }
  }

  private updatePointLightProxy(lightProxy) {
    const light = lightProxy.userData.oriLight;
    const uniforms = lightProxy.material.uniforms;

    const distance = light.distance || 100;

    lightProxy.scale.set(1, 1, 1).multiplyScalar(distance);
    uniforms['lightRadius'].value = distance;

    const positionVS = new THREE.Vector3().setFromMatrixPosition(light.matrixWorld);
    positionVS.applyMatrix4(this.camera.matrixWorldInverse);
    uniforms['lightPosVS'].value = positionVS;
    lightProxy.position.setFromMatrixPosition(light.matrixWorld);

    const intensity = Math.pow(light.intensity, 2);
    uniforms['lightIntensity'].value = intensity;
    uniforms["lightColor"].value.copyGammaToLinear(light.color);
  }

  private createDefferedPointLight(light) {
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

    const geometry = new THREE.SphereGeometry(1, 16, 8);
    matLight.uniforms['viewWidth'].value = this.renderer.width;
    matLight.uniforms['viewHeight'].value = this.renderer.height;

    matLight.uniforms['tColor'].value = this.diffuseRT.texture;
    matLight.uniforms['tNormalDepth'].value = this.normalDepthRT.texture;

    const meshLight = new THREE.Mesh(geometry, matLight);

    meshLight.userData.oriLight = light;

    this.updatePointLightProxy(meshLight);
    return meshLight;
  }

  private initDefferedProps() {
    if (!this.scene.userData.lightSceneProxy) {
      const lightSceneProxy = new THREE.Scene();
      this.scene.userData.lightSceneProxy = lightSceneProxy;
      this.lightSceneProxy = lightSceneProxy;
    }

    this.scene.traverse(obj => {
      if (obj.userData.defferedInitialized) {
        return;
      }
      if (obj instanceof THREE.Light) {
        const lightProxy = this.createDefferedPointLight(obj);
        this.scene.userData.lightSceneProxy.add(lightProxy);
      }
      obj.userData.defferedInitialized = true;
    })
  }


  private animate(delta?: number) {
    requestAnimationFrame(this.animate.bind(this));

    if (this.pause) {
      return;
    }

    this.camCtrls.update();
    // this.renderer.render(this.scene, this.camera);
    // this.initDefferedProps();

    // this.projMatInv.copy(this.camera.projectionMatrix).invert();

    // for (let i = 0, len = this.lightSceneProxy.children.length; i < len; i++) {
    //   const lightProxy = this.lightSceneProxy.children[i];
    //   this.updateLightProxy(lightProxy);
    // }

    // this.passLightProxy.scene = this.lightSceneProxy;
    // this.passLightProxy.camera = this.camera;

    // this.passComposite.scene = this.scene;
    // this.passComposite.camera = this.camera;

    // // 获取 GBuffer
    // this.composer2.render();
    // this.compLight.render();

    // this.renderer.autoClearDepth = true;
    // this.renderer.autoClearStencil = true;
    // this.compFinal.render();
    // // this.renderer.differedTargetScene = this.scene;
    // this.fsQuad.render(this.renderer);
    // this.renderer.differedTargetScene = null;
    this.renderer.render(this.scene, this.camera);

    this.stats.update();
  }
}
