export function image2BW(source: ImageData) {
    const width = source.width;
    const height = source.height;

    const result = new ImageData(width, height);
    for (let j = 0; j < height; j++) {
        for (let i = 0; i < width; i++) {
            const offset = j * 4 * width + i * 4;
            const R = source.data[offset];
            const G = source.data[offset + 1];
            const B = source.data[offset + 2];
            const val = (R * 299 + G * 587 + B * 144) / 1000;
            result.data[offset] = val;
            result.data[offset + 1] = val;
            result.data[offset + 2] = val;
            result.data[offset + 3] = 255;
        }
    }
    return result;
}

export function gaussian(source: ImageData, kernelSize: number = 9) {
    const kRadius = kernelSize >> 1;
    const sigma = kernelSize / 6;

    // const C = 1 / (sigma * Math.sqrt(2 * Math.PI));
    const sigma2Squal = -1 / (2 * sigma * sigma);
    let kernel = Array(kRadius + 1)
        .fill(0)
        .map((_, i) => {
            return Math.exp(i * i * sigma2Squal);
        });
    kernel = kernel.slice(1).reverse().concat(...kernel);
    // 归一化
    const total = kernel.reduce((res, val) => res + val, 0);
    kernel = kernel.map(val => val / total);

    console.log(kernel);

    const width = source.width;
    const height = source.height;

    const distImgData = new ImageData(width, height);
    console.time('loop start');
    // x轴
    for (let j = 0; j < height; j++) {
        for (let i = 0; i < width; i++) {
            const offsetH = j * 4 * width;
            const offsetW = i * 4;
            const offset = offsetH + offsetW;

            let resultR = 0;
            let resultG = 0;
            let resultB = 0;
            for (let k = -kRadius; k < kRadius; k++) {
                const weight = kernel[k + kRadius];

                let idx = i + k;
                idx = Math.max(0, idx);
                idx = Math.min(idx, width - 1);
                const kOffset = offsetH + idx * 4;
                resultR += source.data[kOffset] * weight;
                resultG += source.data[kOffset + 1] * weight;
                resultB += source.data[kOffset + 2] * weight;
            }

            distImgData.data[offset] = resultR;
            distImgData.data[offset + 1] = resultG;
            distImgData.data[offset + 2] = resultB;
            distImgData.data[offset + 3] = 255;
        }
    }
    console.timeEnd('loop start');

    // y轴
    for (let i = 0; i < width; i++) {
        for (let j = 0; j < height; j++) {
            const offsetH = j * 4 * width;
            const offsetW = i * 4;
            const offset = offsetW + offsetH;

            let resultR = 0;
            let resultG = 0;
            let resultB = 0;
            for (let k = -kRadius; k < kRadius; k++) {
                const weight = kernel[k + kRadius];

                let idx = j + k;
                idx = Math.max(0, idx);
                idx = Math.min(idx, height - 1);
                const kOffset = offsetW + idx * 4 * width;
                resultR += distImgData.data[kOffset] * weight;
                resultG += distImgData.data[kOffset + 1] * weight;
                resultB += distImgData.data[kOffset + 2] * weight;
            }

            distImgData.data[offset] = resultR;
            distImgData.data[offset + 1] = resultG;
            distImgData.data[offset + 2] = resultB;
            distImgData.data[offset + 3] = 255;
        }
    }

    return distImgData;
}

export function rgb2hsv(r: number, g: number, b: number) {
    r /= 255;
    g /= 255;
    b /= 255;
    const thetaParam = .5 * (2 * r - g - b) / Math.sqrt(Math.pow(r - g, 2) + (r - b) * (g - b));
    const theta = Math.acos(thetaParam);
    const h = b <= g ? theta : 2 * Math.PI - theta;
    const s = 1 - 3 * Math.min(r, g, b) / (r + g + b);
    const v = (r + g + b) / 3;
    return {
        h, s, v,
        hAngle: h / Math.PI * 180
    };
}