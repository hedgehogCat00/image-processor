import { DepthTexture, ShaderMaterial, WebGLRenderTarget } from 'three';
import { Vector2 } from 'three/build/three.module';
import { Pass } from 'three/examples/jsm/postprocessing/Pass';
const DepthPass = function (renderTarget, width, heigth, scene, camera) {
    Pass.call(this);
    this.outputRenderTarget = renderTarget;
    this._renderTarget = new WebGLRenderTarget(width, heigth, {
        depthTexture: new DepthTexture(),
    });
    this.scene = scene;
    this.camera = camera;
    this.fsQuad = new Pass.FullScreenQuad(null);
    this.fsQuad.material = new ShaderMaterial({
        uniforms: {
            tDepth: { value: null },
        },
        vertexShader: `
        varying vec2 vUv;

        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
        `,
        fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D tDepth;
        #include <packing>

        void main() {
            float depth = texture2D(tDepth, vUv).r;
            // gl_FragColor = vec4(depthColor.r);
            //gl_FragColor = vec4(depthColor.r, 0.2, 0.3, 1.0);

            gl_FragColor = packDepthToRGBA(depth);
        }
        `
    });
};
DepthPass.prototype = Object.assign(Object.create(Pass.prototype), {
    constructor: DepthPass,
    render: function (renderer, writeBuffer, readBuffer) {
        const oriAutoClear = renderer.autoClear;
        renderer.autoClear = false;

        renderer.setRenderTarget(this._renderTarget);
        renderer.clear();
        renderer.render(this.scene, this.camera);

        renderer.clear();
        // renderer.setRenderTarget(readBuffer);
        renderer.setRenderTarget(this.outputRenderTarget);
        this.fsQuad.material.uniforms['tDepth'].value = this._renderTarget.depthTexture;
        this.fsQuad.render(renderer);
        // renderer.copyTextureToTexture(new Vector2(0, 0), this.renderTarget.depthTexture, readBuffer.texture);
        // renderer.setRenderTarget(null);

        renderer.setRenderTarget(null);

        renderer.autoClear = oriAutoClear;
    }
});
export { DepthPass };