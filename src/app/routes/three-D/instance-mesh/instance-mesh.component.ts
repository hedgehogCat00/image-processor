import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import * as THREE from 'three/build/three.module';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

/**
 * 原作者
 * https://discourse.threejs.org/t/modified-three-instancedmesh-dynamically-instancecount/18124/5
 */
@Component({
  selector: 'app-instance-mesh',
  templateUrl: './instance-mesh.component.html',
  styleUrls: ['./instance-mesh.component.less']
})
export class InstanceMeshComponent implements OnInit, AfterViewInit {
  @ViewChild('webgl') canvasRef: ElementRef;
  private scene: any;
  private camera: any;
  private renderer: any;
  constructor() { }


  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
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
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.camera = new THREE.PerspectiveCamera(60, width / height, .1, 100)
    this.camera.position.set(0, -3, 4).setLength(4);
    const controls = new OrbitControls(this.camera, this.renderer.domElement)

    const light = new THREE.DirectionalLight(0xffffff, 1.5)
    light.position.set(100, -50, 50);
    light.castShadow = true;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 250;

    let camSize = 10;
    light.shadow.camera.left = -camSize;
    light.shadow.camera.bottom = -camSize;
    light.shadow.camera.right = camSize;
    light.shadow.camera.top = camSize;

    this.scene.add(light);
    this.scene.add(new THREE.AmbientLight(0xffffff, .5))

    const g = new THREE.CylinderBufferGeometry(.5, .5, .1, 6)
    g.rotateX(Math.PI * .5)

    const m = new THREE.MeshStandardMaterial({
      color: 0x222244,
      roughness: .75,
      metalness: .25
    })
    const hexUniforms = {
      time: { value: 0 },
      globalBloom: { value: 0 }
    }
    m.onBeforeCompile = shader => {
      shader.uniforms.time = hexUniforms.time;
      shader.uniforms.globalBloom = hexUniforms.globalBloom;
      shader.vertexShader = `
      attribute vec3 instColor;
      attribute vec2 colorPhase;
      varying vec3 vPos;
      varying vec3 vInstColor;
      varying vec2 vColorPhase;
      ${shader.vertexShader}
      `.replace(
        `#include <fog_vertex>`,
        `
        #include <fog_vertex>
        vPos=vec3(transformed);
        vInstColor=vec3(instColor);
        vColorPhase=colorPhase;
        `
      );
      shader.fragmentShader = `
      uniform float time;
      uniform float globalBloom;
      varying vec3 vPos;
      varying vec3 vInstColor;
      varying vec2 vColorPhase;
      ${shader.fragmentShader}
      `.replace(
        `#include <dithering_fragment>`,
        `
        #include <dithering_fragment>
        gl_FragColor = globalBloom > 0.5 ? vec4(0,0,0,1) : gl_FragColor;

        float t = sin(time * PI * vColorPhase.y + vColorPhase.x) * 0.5 + 0.5;
        vec3 c = mix(gl_FragColor.rgb, vInstColor, t);
        
        float a = smoothstep(0.015, 0.02 + (1. - t) * 0.03, abs(vPos.z));

        gl_FragColor.rgb = mix(c, gl_FragColor.rgb, a );
        `
      )
    }

    const circleCount = 10;
    // 计算六边形每一个梯形面积
    // 顶部一个，底部 circleCount 个
    // 高度为 circleCount
    const instCount = ((circleCount * (circleCount + 1)) / 2) * 6 + 1;
    const o = new THREE.InstancedMesh(g, m, instCount);
    o.userData.phases = [];
    o.castShadow = true;
    o.receiveShadow = true;

    let colors = [
      new THREE.Color(0xffffff),
      new THREE.Color(0xff8888),
      new THREE.Color(0x88ff88),
      new THREE.Color(0x8888ff)
    ];
    let instColor = [];

    let colorPhase = [];
    let dummy = new THREE.Object3D();

    // hexagonal grid points ///////////////////////////////////////////////////////////////////////////
    // sin(60°) * 1.025 计算等边三角形的高
    let unit = Math.sqrt(3) * 0.5 * 1.025;
    // 60°
    let angle = Math.PI / 3;
    let axis = new THREE.Vector3(0, 0, 1);

    let axisVector = new THREE.Vector3(0, -unit, 0);
    let sideVector = new THREE.Vector3(0, unit, 0).applyAxisAngle(axis, -angle);
    let vec3 = new THREE.Vector3(); // temp vector
    let counter = 0;
    for (let seg = 0; seg < 6; seg++) {
      // 每一个六边形几何体
      for (let ax = 1; ax <= circleCount; ax++) {
        for (let sd = 0; sd < ax; sd++) {
          vec3.copy(axisVector)
            .multiplyScalar(ax)
            .addScaledVector(sideVector, sd)
            .applyAxisAngle(axis, (angle * seg) + (Math.PI / 6));

          this.setHexData(o, dummy, vec3, counter);

          counter++;
        }
      }
    }
    this.setHexData(o, dummy, new THREE.Vector3(), counter); // central hex

    g.setAttribute(
      "instColor",
      new THREE.InstancedBufferAttribute(new Float32Array(instColor), 3)
    );
    g.setAttribute(
      "colorPhase",
      new THREE.InstancedBufferAttribute(new Float32Array(colorPhase), 2)
    );
    console.log(o);

    this.scene.add(o);
  }

  setHexData(o: any, dummy: any, vec3: any, counter: number) {
    throw new Error('Function not implemented.');
  }
}

