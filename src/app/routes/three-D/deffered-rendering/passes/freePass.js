import { DepthTexture, ShaderMaterial, WebGLRenderTarget } from 'three';
import { Vector2 } from 'three/build/three.module';
import { Pass } from 'three/examples/jsm/postprocessing/Pass';
import { normalIntensityMat } from '../../scripts/Gbuffers';

const FreePass = function (renderTarget, material, scene, camera) {
    Pass.call(this);
    this.renderTarget = renderTarget;
    this.material = material;
    this.scene = scene;
    this.camera = camera;
    // this.fsQuad = new Pass.FullScreenQuad(null);
    // this.fsQuad.material = new ShaderMaterial({
    //     uniforms: {
    //         tDiffuse: { value: null }
    //     },
    //     vertexShader: `
    //     varying vec2 vUv;
    //     void main() {
    //         vUv = uv;
    //         gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    //     }
    //     `,
    //     fragmentShader: `
    //     varying vec2 vUv;
    //     uniform sampler2D tDiffuse;
    //     void main() {
    //         vec4 texData = texture2D(tDiffuse, vUv);
    //         gl_FragColor = vec4(texData);
    //         // gl_FragColor = vec4(.2, .5, .6, 1.);
    //     }
    //     `
    // });
};
FreePass.prototype = Object.assign(Object.create(Pass.prototype), {
    constructor: FreePass,
    render: function (renderer, writeBuffer, readBuffer) {
        const oriAutoClear = renderer.autoClear;
        renderer.autoClear = false;
        const oriMat = this.scene.overrideMaterial;
        this.scene.overrideMaterial = this.material;

        renderer.setRenderTarget(this.renderTarget);
        renderer.clear();
        renderer.render(this.scene, this.camera);

        // renderer.setRenderTarget(readBuffer);
        // renderer.copyTextureToTexture(new Vector2(0, 0), this.renderTarget.depthTexture, readBuffer.texture);
        // renderer.setRenderTarget(null);

        renderer.setRenderTarget(null);
        // this.fsQuad.material.uniforms['tDiffuse'].value = this.renderTarget.texture;
        // this.fsQuad.render(renderer);

        renderer.autoClear = oriAutoClear;
        this.scene.overrideMaterial = oriMat;
    }
});
export { FreePass };