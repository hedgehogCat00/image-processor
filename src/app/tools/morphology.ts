export function enrose(source: ImageData, kernel: number[][]) {
    // const kernel = [
    //   [0, 1, 0],
    //   [1, 1, 1],
    //   [0, 1, 0],
    // ];
    const radius = kernel.length >> 1;
    const width = source.width;
    const height = source.height;

    const distImgData = new ImageData(width, height);
    const hEnd = height - radius;
    const wEnd = width - radius;
    for (let j = radius; j < hEnd; j++) {
        for (let i = radius; i < wEnd; i++) {

            let unfit = false;
            for (let kj = -radius; kj < radius && !unfit; kj++) {
                for (let ki = -radius; ki < radius && !unfit; ki++) {
                    const weight = kernel[kj + radius][ki + radius];
                    if (weight === 0) {
                        continue;
                    }

                    const hOffset = (j + kj) * 4 * width;
                    const wOffset = (i + ki) * 4;
                    const color = source.data[hOffset + wOffset];
                    if (weight * color === 0) {
                        unfit = true;
                    }
                }
            }

            const hOffset = j * 4 * width;
            const wOffset = i * 4;
            const offset = hOffset + wOffset;
            distImgData.data[offset + 3] = 255;
            if (!unfit) {
                distImgData.data[offset] = 255;
                distImgData.data[offset + 1] = 255;
                distImgData.data[offset + 2] = 255;
            }
        }
    }

    return distImgData;
}

export function dilate(source: ImageData, kernel: number[][]) {
    const radius = kernel.length >> 1;
    const width = source.width;
    const height = source.height;

    const distImgData = new ImageData(width, height);
    const hEnd = height - radius;
    const wEnd = width - radius;
    for (let j = radius; j < hEnd; j++) {
        for (let i = radius; i < wEnd; i++) {

            let hit = false;
            for (let kj = -radius; kj < radius && !hit; kj++) {
                for (let ki = -radius; ki < radius && !hit; ki++) {
                    const weight = kernel[kj + radius][ki + radius];
                    if (weight === 0) {
                        continue;
                    }

                    const khOffset = (j + kj) * 4 * width;
                    const kwOffset = (i + ki) * 4;
                    const color = source.data[khOffset + kwOffset];
                    if (weight * color > 0) {
                        hit = true;
                    }
                }
            }

            const hOffset = j * 4 * width;
            const wOffset = i * 4;
            const offset = hOffset + wOffset;
            distImgData.data[offset + 3] = 255;
            if (hit) {
                distImgData.data[offset] = 255;
                distImgData.data[offset + 1] = 255;
                distImgData.data[offset + 2] = 255;
            }
        }
    }

    return distImgData;
}

/**
 * 形态学开
 * @param source 
 * @returns 
 */
export function morphOpen(source: ImageData, kernel: number[][]) {
    return dilate(enrose(source, kernel), kernel);
}

/**
 * 形态学闭
 * @param source 
 * @returns 
 */
export function morphClose(source: ImageData, kernel: number[][]) {
    return enrose(dilate(source, kernel), kernel);
}