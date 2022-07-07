import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import * as THREE from 'three/build/three.module';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { SavePass } from 'three/examples/jsm/postprocessing/SavePass';
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader';

@Component({
  selector: 'app-life-game',
  templateUrl: './life-game.component.html',
  styleUrls: ['./life-game.component.less']
})
export class LifeGameComponent implements OnInit, AfterViewInit {
  @ViewChild('webgl') canvasRef: ElementRef;
  private scene: any;
  private camera: any;
  private renderer: any;
  private pause = false;
  private lastFrameRT: any;
  private planeMat: any;

  private composer: any;

  constructor() { }

  ngOnInit(): void {
  }

  ngAfterViewInit() {
    const cvs = this.canvasRef.nativeElement as HTMLCanvasElement;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#adadad');

    this.renderer = new THREE.WebGLRenderer({
      canvas: cvs,
      antialias: true
    });
    const width = cvs.offsetWidth;
    const height = cvs.offsetHeight;
    this.renderer.setSize(cvs.offsetWidth, cvs.offsetHeight);

    this.camera = new THREE.OrthographicCamera(width / - 2, width / 2, height / 2, height / - 2, 1, 1000)
    // const controls = new OrbitControls(this.camera, cvs);

    this.camera.position.z = 2;
    this.scene.add(this.camera);

    this.lastFrameRT = new THREE.WebGLRenderTarget(width, height);

    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    const savePass = new SavePass(this.lastFrameRT);
    this.composer.addPass(savePass);

    const copyPass = new ShaderPass(CopyShader);
    this.composer.addPass(copyPass);
    // this.composer.renderTarget2 = this.lastFrameRT;

    const planeGeo = new THREE.PlaneGeometry(width, height);
    // const planeGeo = new THREE.PlaneGeometry(10, 10);
    // const mat = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide });
    const initPoints = Array(250).fill(0).map(() => {
      return {
        x: Math.floor(Math.random() * width / -2 / 10 + width / 2),
        y: Math.floor(Math.random() * height / -2 / 10 + height / 2),
      }
    })
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        lastFrame: { value: this.lastFrameRT.texture },
        // lastFrame: { value: this.composer.renderTarget2.texture },
        initPoints: { value: initPoints },
        initPointsCount: { value: initPoints.length },
        wWidth: { value: width },
        wHeight: { value: height }
      },
      vertexShader: `
      varying vec2 vUv;
      void main() {
          vUv=uv;
          vec4 mvPosition = modelViewMatrix * vec4( position, 1. );
          gl_Position = projectionMatrix * mvPosition;
      }
      `,
      fragmentShader: `
      uniform sampler2D lastFrame;
      uniform float wWidth;
      uniform float wHeight;

      varying vec2 vUv;
  
      struct Point {
          int x;
          int y;
      };
      uniform Point initPoints[${initPoints.length}];
      uniform int initPointsCount;
  
      void main(){
        bool found = false;
        int currX = int( floor(vUv.x * wWidth) );
        int currY = int( floor(vUv.y * wHeight) );
        vec2 texCoord = gl_FragCoord.xy / vec2( wWidth, wHeight );

        if(initPointsCount > 0){
          for(int i = 0; i < initPointsCount; i++) {
           Point p = initPoints[i];
           if(p.x==currX && p.y==currY){
            gl_FragColor = vec4(1., 1., 0., 1.);         
            found=true;
            break;
           }
         }
         
         if(!found){
          gl_FragColor = vec4(0., 0., 0., 1.);
         }  

       } else {
         vec2 neighbours[8];

         neighbours[0] = vec2(0., 1.);
         neighbours[1] = vec2(1., 1.);
         neighbours[2] = vec2(1., 0.);
         neighbours[3] = vec2(1., -1.);
         neighbours[4] = vec2(0., -1.);
         neighbours[5] = vec2(-1., -1.);
         neighbours[6] = vec2(-1., 0.);
         neighbours[7] = vec2(-1., 1.);

         vec2 tmpCoord; 
         int blackCount=0;
         for(int i = 0; i < 8; i++){
          tmpCoord = (gl_FragCoord.xy + neighbours[i]) / vec2( wWidth, wHeight );
         
          if(texture2D(lastFrame, tmpCoord).r == 0.){
            blackCount += 1;
          }
         
        }

        vec4 lightColor=vec4(1., 1., 0., 1.);
        vec4 darkColor=vec4(0., 0., 0., 1.);
        vec4 selfColor = texture2D(lastFrame, texCoord);
        if(blackCount==5){
         gl_FragColor = lightColor;
        } else if(blackCount==6){
         gl_FragColor = selfColor;
        } else if(blackCount>6){
         gl_FragColor = darkColor;
        } else if(blackCount<5) {
         gl_FragColor = darkColor;
        } else {
          //gl_FragColor = lightColor;
        }

        //gl_FragColor = texture2D(lastFrame, texCoord);
       }

      }`,
    })
    const plane = new THREE.Mesh(planeGeo, mat);
    this.planeMat = mat;
    this.scene.add(plane);

    this.animate();
  }

  private animate(delta?: number) {
    setTimeout(this.animate.bind(this), 100);
    // requestAnimationFrame(this.animate.bind(this));

    if (this.pause) {
      return;
    }
    // this.renderer.render(this.scene, this.camera);
    this.composer.render();
    if (this.planeMat.uniforms.initPointsCount.value > 0) {
      this.planeMat.uniforms.initPointsCount.value = 0
    }
  }
}
