import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
// import * as THREE from 'three/build/three.module';
import {
  Vector2,
  Vector3,
  Scene,
  OrthographicCamera,
  WebGLRenderer,
  Mesh,
  InstancedMesh,
  CircleGeometry,
  MeshBasicMaterial,
  LineBasicMaterial,
  Matrix4,
  Layers,
  Color,
  BufferGeometry,
  PlaneGeometry,
  CanvasTexture,
  BufferAttribute,
  LineSegments,
  SplineCurve,
  CatmullRomCurve3,
  Line
} from 'three/build/three.module';
import Delaunator from 'delaunator';

interface BoneItem {
  radius: number;
  // angleConstraint: [left side const, right side const]
  angleConstraint: number[];
  position: Vector3;
  direction: Vector3;
}

enum ModelLayer {
  Default = 0,
  Bone = 1,
  Helper = 2
}

@Component({
  selector: 'app-follow-bones',
  templateUrl: './follow-bones.component.html',
  styleUrls: ['./follow-bones.component.less']
})
export class FollowBonesComponent implements OnInit, AfterViewInit {
  @ViewChild('webgl') canvasRef: ElementRef;
  private scene: any;
  private camera: any;
  private renderer: any;
  private bones: BoneItem[];
  private bonesMesh: InstancedMesh;
  private currMousePos: Vector2 = new Vector3();
  private currMouseAbsPos: Vector2 = new Vector3();
  constructor() { }

  ngOnInit(): void {
    this.boneGap = 50;
    this.bones = this.genBones([
      { radius: 25, angleConstraint: [Math.PI / 4, Math.PI / 4] },
      { radius: 35, angleConstraint: [Math.PI / 4, Math.PI / 4] },
      { radius: 50, angleConstraint: [Math.PI / 4, Math.PI / 4] },
      { radius: 35, angleConstraint: [Math.PI / 4, Math.PI / 4] },
      { radius: 25, angleConstraint: [Math.PI / 4, Math.PI / 4] },
      { radius: 15, angleConstraint: [Math.PI / 4, Math.PI / 4] },
      { radius: 7, angleConstraint: [Math.PI / 4, Math.PI / 4] },
      { radius: 5, angleConstraint: [Math.PI / 4, Math.PI / 4] },
      { radius: 3, angleConstraint: [Math.PI / 4, Math.PI / 4] },
    ]);
    this.bonesMesh = this.genBonesMesh(this.bones);
    this.mouseCursorMesh = this.genMouseCursorMesh();
  }
  ngAfterViewInit() {
    const cvs = this.canvasRef.nativeElement as HTMLCanvasElement;
    cvs.addEventListener('mousemove', (e) => {
      const rect = cvs.getBoundingClientRect();
      this.currMousePos.set(
        (e.clientX - rect.left) / rect.width * 2 - 1,
        (e.clientY - rect.top) / rect.height * -2 + 1,
        0
      );
      this.currMouseAbsPos.set(this.currMousePos.x * rect.width / 2, this.currMousePos.y * rect.height / 2, 0);
    });

    this.scene = new Scene();
    this.scene.background = new Color('#adadad');

    this.renderer = new WebGLRenderer({
      canvas: cvs,
      antialias: true
    });
    const width = cvs.offsetWidth;
    const height = cvs.offsetHeight;
    this.renderer.setSize(cvs.offsetWidth, cvs.offsetHeight);

    this.camera = new OrthographicCamera(width / - 2, width / 2, height / 2, height / - 2, 1, 1000)
    // const controls = new OrbitControls(this.camera, cvs);
    this.camera.position.z = 2;
    this.camera.layers.enable(ModelLayer.Bone);
    this.camera.layers.enable(ModelLayer.Helper);
    this.scene.add(this.camera);

    this.scene.add(this.mouseCursorMesh);
    this.scene.add(this.bonesMesh);

    this.animate();
  }

  private boneGap: number = 10;
  private genBones(configs: { radius: number; angleConstraint: number[] }[]): BoneItem[] {
    const bones: BoneItem[] = [];
    let lastBone: BoneItem = null;
    const count = configs.length;
    for (let i = 0; i < count; i++) {
      const config = configs[i];
      const bone = {
        radius: config.radius,
        angleConstraint: config.angleConstraint,
        position: new Vector3(0, 0, 0),
        direction: new Vector3(-1, 0, 0)
      };
      if (lastBone) {
        bone.position.copy(lastBone.position);
        bone.position.x += this.boneGap;
        // the direction points to the previous bone
        bone.direction.copy(lastBone.position.clone().sub(bone.position).normalize());
      }
      bones.push(bone);
      lastBone = bone;
    }
    return bones;
  }

  private boneSize = 10;
  private genBonesMesh(bones: BoneItem[]): InstancedMesh {
    const geometry = new CircleGeometry(1, 32);
    const material = new MeshBasicMaterial({
      color: 0xffffff,
    });
    // const material = new LineBasicMaterial({
    //   color: 0xffff00,
    //   linewidth: 1
    // });
    const mesh = new InstancedMesh(geometry, material, bones.length);
    bones.forEach((bone, i) => {
      const matrix = new Matrix4()
        .scale(new Vector3(this.boneSize, this.boneSize, 1))
        .setPosition(bone.position.x, bone.position.y, bone.position.z);
      mesh.setMatrixAt(i, matrix);
    });
    mesh.layers.set(ModelLayer.Bone);

    // use canvas texture to draw a circle texture
    const canvas = document.createElement('canvas');
    const texSize = 64;
    canvas.width = texSize;
    canvas.height = texSize;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.setLineDash([15, 5]);
    ctx.beginPath();
    ctx.arc(texSize / 2, texSize / 2, texSize / 2 - ctx.lineWidth / 2 - 0.1, 0, Math.PI * 2);
    ctx.stroke();
    const boundTex = new CanvasTexture(canvas);
    boundTex.needsUpdate = true;

    const boundMat = new MeshBasicMaterial({
      map: boundTex,
      transparent: true,
    });
    // generate a circle line geometry to represent the bound of the bone
    // const boundGeoPoints = Array(32).fill(0).map((_, i) => {
    //   const angle = Math.PI * 2 / 32 * i;
    //   return new Vector3(Math.cos(angle), Math.sin(angle), 0);
    // });
    const boundGeo = new PlaneGeometry(1, 1);
    const boneBoundMesh = new InstancedMesh(boundGeo, boundMat, bones.length);
    bones.forEach((bone, i) => {
      const matrix = new Matrix4()
        .scale(new Vector3(bone.radius * 2, bone.radius * 2, 1))
        .setPosition(bone.position.x, bone.position.y, bone.position.z);
      boneBoundMesh.setMatrixAt(i, matrix);
    });
    boneBoundMesh.layers.set(ModelLayer.Helper);
    mesh.add(boneBoundMesh);

    // add a line to represent the direction of the bone
    const lineGeo = new BufferGeometry();
    const linePos = new Float32Array(bones.length * 2 * 3);
    bones.forEach((bone, i) => {
      const pos = bone.position;
      linePos[i * 6] = pos.x;
      linePos[i * 6 + 1] = pos.y;
      linePos[i * 6 + 2] = pos.z;
      const dir = bone.direction.clone().multiplyScalar(10);
      linePos[i * 6 + 3] = pos.x + dir.x;
      linePos[i * 6 + 4] = pos.y + dir.y;
      linePos[i * 6 + 5] = pos.z + dir.z;
    });
    lineGeo.setAttribute('position', new BufferAttribute(linePos, 3));
    const lineMat = new LineBasicMaterial({
      color: 0x00ff00,
      linewidth: 1
    });
    const lineSegs = new LineSegments(lineGeo, lineMat);
    lineSegs.layers.set(ModelLayer.Helper);
    mesh.add(lineSegs);

    // generate the bounding points
    // for the first bone, the bounding points are the -90,-45,0,45,90 degree points
    // for the rest bones, the bounding points are the -90,90 degree points
    // these points are used to generate a curve, which is used to generate a wrapper of the bones
    const boundPoints = [];
    let lastBondPIdx = 0;
    for (let i = 0; i < bones.length; i++) {
      const bone = bones[i];
      if (i === 0) {
        [-Math.PI / 2, -Math.PI / 4, 0, Math.PI / 4, Math.PI / 2].forEach(angle => {
          // consider the direction of the bone
          const point = bone.direction.clone()
            .normalize()
            .applyAxisAngle(new Vector3(0, 0, 1), angle)
            .multiplyScalar(bone.radius)
            .add(bone.position);
          boundPoints.push(new Vector3(point.x, point.y, 0));
        });
        lastBondPIdx = boundPoints.length;
      } else {
        const points = [-Math.PI / 2, Math.PI / 2].map(angle => {
          const p = bone.direction.clone()
            .normalize()
            .applyAxisAngle(new Vector3(0, 0, 1), angle)
            .multiplyScalar(bone.radius)
            .add(bone.position);
          return new Vector3(p.x, p.y, 0);
        });
        boundPoints.splice(lastBondPIdx, 0, points[1], points[0]);
        lastBondPIdx += 1;
      }
    }
    // // complete the loop
    // boundPoints.push(boundPoints[0]);

    const curve = new CatmullRomCurve3(boundPoints);
    curve.closed = true;
    curve.curveType = 'catmullrom';
    curve.tension = 0.5;

    // fix the length of each segment
    const boundCurvePoints = curve.getSpacedPoints(
      Math.ceil(curve.getLength() / 10)
    );
    const curveObj = new Line(
      new BufferGeometry().setFromPoints(boundCurvePoints),
      new LineBasicMaterial({ color: 0xff0000 })
    )
    curveObj.layers.set(ModelLayer.Helper);
    mesh.add(curveObj);
    const boundCoords = boundCurvePoints.reduce((arr, p) => { arr.push(p.x, p.y); return arr; }, []);
    const delau = new Delaunator(boundCoords);
    const delauIdxes = delau.triangles;
    const boundGeo2 = new BufferGeometry();
    const boundPos = new Float32Array(delauIdxes.length * 3);
    delauIdxes.forEach((idx, i) => {
      const p = boundCurvePoints[idx];
      boundPos[i * 3] = p.x;
      boundPos[i * 3 + 1] = p.y;
      boundPos[i * 3 + 2] = 0;
    });
    boundGeo2.setAttribute('position', new BufferAttribute(boundPos, 3));
    const boundMesh2 = new Mesh(boundGeo2, new MeshBasicMaterial({
      color: 0x0000ff,
      wireframe: true
    }));
    boundMesh2.layers.set(ModelLayer.Helper);
    // mesh.add(boundMesh2);

    return mesh;
  }

  private mouseCursorMesh: Mesh;
  private genMouseCursorMesh(): Mesh {
    const geometry = new CircleGeometry(5, 32);
    const material = new MeshBasicMaterial({
      color: 0xff0000,
    });
    const mesh = new Mesh(geometry, material, 1);
    mesh.layers.set(ModelLayer.Helper);
    return mesh;
  }

  private animate(delta?: number) {
    requestAnimationFrame(this.animate.bind(this));
    this.mouseCursorMesh.position.copy(this.currMouseAbsPos);
    // update bones' positions
    // the first bone follows the mouse cursor
    // the rest bones follow the previous bone, and the relative position is constrained by previous bone's position
    const tmpMatrix = new Matrix4();
    // this.bonesMesh.getMatrixAt(0, tmpMatrix);
    // tmpMatrix.setPosition(this.bones[0].position);
    // this.bonesMesh.setMatrixAt(0, tmpMatrix.clone());
    for (let i = 0; i < this.bones.length; i++) {
      const bone = this.bones[i];
      let followPos;
      if (i === 0) {
        followPos = this.currMouseAbsPos;
        if (followPos.distanceTo(bone.position) < 1) {
          continue;
        }
      } else {
        const prevBone = this.bones[i - 1];
        followPos = prevBone.position;
      }
      const newDir = followPos.clone().sub(bone.position).normalize();
      const angle = newDir.angleTo(bone.direction);
      if (angle < 0) {
        // compare the angle with the left side constraint
        if (-angle > bone.angleConstraint[0]) {
          newDir.copy(bone.direction.clone().applyAxisAngle(new Vector3(0, 0, 1), -bone.angleConstraint[0]));
          console.log('meet left constraint');
        }
      } else {
        // compare the angle with the right side constraint
        if (angle > bone.angleConstraint[1]) {
          newDir.copy(bone.direction.clone().applyAxisAngle(new Vector3(0, 0, 1), bone.angleConstraint[1]));
          console.log('meet right constraint');
        }
      }
      if (i === 0) {
        bone.position.copy(this.currMouseAbsPos);
      } else {
        bone.position.copy(followPos.clone().sub(newDir.clone().multiplyScalar(this.boneGap)));
      }
      bone.direction.copy(newDir);
      this.bonesMesh.getMatrixAt(i, tmpMatrix);
      tmpMatrix.setPosition(bone.position);
      this.bonesMesh.setMatrixAt(i, tmpMatrix.clone());
    }
    this.bonesMesh.instanceMatrix.needsUpdate = true;

    // update boneBound positions
    const bouneBoundMesh = this.bonesMesh.children[0];
    for (let i = 0; i < this.bones.length; i++) {
      const bone = this.bones[i];
      bouneBoundMesh.getMatrixAt(i, tmpMatrix);
      tmpMatrix.setPosition(bone.position);
      bouneBoundMesh.setMatrixAt(i, tmpMatrix.clone());
    }
    bouneBoundMesh.instanceMatrix.needsUpdate = true;

    // update bone direction line
    const lineSegs = this.bonesMesh.children[1];
    const lineGeo = lineSegs.geometry;
    const linePos = lineGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < this.bones.length; i++) {
      const bone = this.bones[i];
      const pos = bone.position;
      linePos[i * 6] = pos.x;
      linePos[i * 6 + 1] = pos.y;
      linePos[i * 6 + 2] = pos.z;
      const dir = bone.direction.clone().multiplyScalar(10);
      linePos[i * 6 + 3] = pos.x + dir.x;
      linePos[i * 6 + 4] = pos.y + dir.y;
      linePos[i * 6 + 5] = pos.z + dir.z;
    }
    lineGeo.attributes.position.needsUpdate = true;

    this.renderer.render(this.scene, this.camera);
  }
}
