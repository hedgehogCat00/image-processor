export const shaders = {
    vs: `
    void main() {
        vec4 mvPosition = modelViewMatrix * vec4( position, 1. );
        gl_Position = projectionMatrix * mvPosition;
    }
    `,
    fs: `
    uniform sampler2D lastFrame;

    struct Point {
        int x;
        int y;
    }
    uniform Point initPoints[];
    uniform int initPointsCount;

    void main(){
        gl_FragColor = vec4(1.,1.,0.,1.);
    }
    `
}