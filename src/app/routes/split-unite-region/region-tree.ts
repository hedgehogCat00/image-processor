import { rgb2hsv } from "src/app/tools/image-common";

export class RegionTree {
    private children: RegionTree[] = [];
    private pass = false;
    private info;
    constructor(
        private srcCtx: CanvasRenderingContext2D,
        private distCtx: CanvasRenderingContext2D,
        private width: number,
        private height: number,
        private x: number,
        private y: number,
        private minSize: number
    ) {
        const info = this.statistics();
        this.info = info;
        // if (
        //     Math.abs(info.RMean - 255 * 0.717) < 20 &&
        //     Math.abs(info.GMean - 255 * 0.243) < 20 &&
        //     Math.abs(info.BMean - 255 * 0.229) < 15 &&
        //     Math.abs((info.RVal - 255 * 0.09)) < 15 &&
        //     Math.abs((info.GVal - 255 * 0.175)) < 20 &&
        //     Math.abs((info.BVal - 255 * 0.159)) < 20
        // ) {
        const { hAngle } = rgb2hsv(info.RMean, info.GMean, info.BMean);
        if (
            (0 <= hAngle && hAngle <= 5) || (355 <= hAngle && hAngle <= 360)
            // Math.abs(info.RMean - 255 * 0.717) < 20 &&
            // Math.abs(info.GMean - 255 * 0.243) < 20 &&
            // Math.abs(info.BMean - 255 * 0.229) < 15 &&
            // Math.abs((info.RVal - 255 * 0.09)) < 15 &&
            // Math.abs((info.GVal - 255 * 0.175)) < 20 &&
            // Math.abs((info.BVal - 255 * 0.159)) < 20
        ) {
            this.pass = true;
        } else {
            if (width > minSize && height > minSize) {
                const childWidL = width >> 1;
                const childHeiT = height >> 1;

                const childWidR = width - childWidL;
                const childHeiB = height - childHeiT;

                this.children.push(
                    new RegionTree(srcCtx, distCtx, childWidL, childHeiT, x, y, minSize),
                    new RegionTree(srcCtx, distCtx, childWidR, childHeiT, x + childWidL, y, minSize),
                    new RegionTree(srcCtx, distCtx, childWidL, childHeiB, x, y + childHeiT, minSize),
                    new RegionTree(srcCtx, distCtx, childWidR, childHeiB, x + childWidL, y + childHeiT, minSize),
                );
            }
        }
    }

    generate() {
        if (this.children.length) {
            this.children.forEach(child => child.generate());
        } else {
            // if(this.pass) {
            //     this.ctx.fillStyle='white';
            //     this.ctx.fillRect(this.x, this.y, this.width, this.height);
            // } else {

            // }
            this.distCtx.fillStyle = this.pass ? 'white' : 'black';
            this.distCtx.fillRect(this.x, this.y, this.width, this.height);
            // this.distCtx.fillStyle = 'white';
            // this.distCtx.fillRect(this.x, this.y, 10, 10);
        }
    }

    statistics() {
        const imgData = this.srcCtx.getImageData(this.x, this.y, this.width, this.height);

        const count = this.width * this.height;

        let RTotal = 0;
        let GTotal = 0;
        let BTotal = 0;
        for (let j = 0; j < this.height; j++) {
            for (let i = 0; i < this.width; i++) {
                const offset = j * 4 * this.width + i * 4;
                RTotal += imgData.data[offset];
                GTotal += imgData.data[offset + 1];
                BTotal += imgData.data[offset + 2];
            }
        }

        const RMean = RTotal / count;
        const GMean = GTotal / count;
        const BMean = BTotal / count;

        let RVal = 0;
        let GVal = 0;
        let BVal = 0;
        for (let j = 0; j < this.height; j++) {
            for (let i = 0; i < this.width; i++) {
                const offset = j * 4 * this.width + i * 4;
                RVal += Math.pow(imgData.data[offset] - RMean, 2);
                GVal += Math.pow(imgData.data[offset + 1] - GMean, 2);
                BVal += Math.pow(imgData.data[offset + 2] - BMean, 2);
            }
        }
        RVal = Math.sqrt(RVal / count);
        GVal = Math.sqrt(GVal / count);
        BVal = Math.sqrt(BVal / count);

        return {
            RMean, GMean, BMean,
            RVal, GVal, BVal
        };
    }

}

export class RegionTreeNode {
    constructor(

    ) {

    }
}