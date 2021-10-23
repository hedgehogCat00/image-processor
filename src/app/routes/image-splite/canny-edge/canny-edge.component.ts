import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { gaussian, image2BW } from 'src/app/tools/image-common';

@Component({
  selector: 'app-canny-edge',
  templateUrl: './canny-edge.component.html',
  styleUrls: ['./canny-edge.component.less']
})
export class CannyEdgeComponent implements OnInit {
  @ViewChild('distCanvas') distCanvasRef: ElementRef<HTMLCanvasElement>;
  sourceImageSrc: string;
  thVal: number = .08;

  constructor() { }

  ngOnInit(): void {
  }

  loadImage(evt: Event) {
    const ipt = evt.target as HTMLInputElement;
    const file = ipt.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.sourceImageSrc = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  load2Canvas() {
    const cvs = this.distCanvasRef.nativeElement;
    const ctx = cvs.getContext('2d');

    const image = new Image();
    image.onload = () => {
      setTimeout(() => {
        cvs.width = image.width;
        cvs.height = image.height;
        ctx.drawImage(image, 0, 0);
        let cannyImgData = this.canny(ctx, cvs.width, cvs.height);
        ctx.putImageData(cannyImgData, 0, 0);
      }, 1);

    }
    image.src = this.sourceImageSrc;
  }

  private canny(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const imgData = ctx.getImageData(0, 0, width, height);
    let bwImgData = image2BW(imgData);
    bwImgData = gaussian(bwImgData, 5);
    const gradientInfo = this.sobelEdge(bwImgData);
    const gradLatitudes = this.calcGradLatitude(gradientInfo.x, gradientInfo.y);
    // return this.showSobel(width, height, gradLatitudes);
    const gradAngles = this.calcGradAngle(gradientInfo.x, gradientInfo.y);

    const noMax = new ImageData(width, height);
    // 抑制非最大边缘点
    gradAngles.forEach((radiant, idx) => {
      const j = Math.floor(idx / width);
      const i = idx - j * width;
      const imgOffset = 4 * idx;

      const currLat = gradLatitudes[idx];
      noMax.data[imgOffset + 3] = 255;

      // 法线纵向，则线条横向
      if (this.isVert(radiant)) {
        const rigthLat = i >= (width - 1) ? 0 : gradLatitudes[idx + 1];
        const leftLat = i <= 0 ? 0 : gradLatitudes[idx - 1];
        if ((currLat > rigthLat) && (currLat > leftLat)) {
          noMax.data[imgOffset] = 255;
          noMax.data[imgOffset + 1] = 255;
          noMax.data[imgOffset + 2] = 255;
        }
      } else if (this.isHori(radiant)) {
        const topLat = j <= 0 ? 0 : gradLatitudes[idx - width];
        const bottomLat = j >= (height - 1) ? 0 : gradLatitudes[idx + width];
        if ((currLat > topLat) && (currLat > bottomLat)) {
          noMax.data[imgOffset] = 255;
          noMax.data[imgOffset + 1] = 255;
          noMax.data[imgOffset + 2] = 255;
        }
      } else if (this.is45(radiant)) {
        const topLeftLat = (i > 0) && (j < (height - 1)) ? gradLatitudes[idx - width - 1] : 0;
        const bottomRightLat = (i < (width - 1)) && (j < (height - 1)) ? gradLatitudes[idx + width + 1] : 0;
        if ((currLat > topLeftLat) && (currLat > bottomRightLat)) {
          noMax.data[imgOffset] = 255;
          noMax.data[imgOffset + 1] = 255;
          noMax.data[imgOffset + 2] = 255;
        }
      }
      else {
        const topRightLat = (i < (width - 1)) && (j > 0) ? gradLatitudes[idx + width + 1] : 0;
        const bottomLeftLat = (i > 0) && (j < (height - 1)) ? gradLatitudes[idx + width - 1] : 0;
        if ((currLat > topRightLat) && (currLat > bottomLeftLat)) {
          noMax.data[imgOffset] = 255;
          noMax.data[imgOffset + 1] = 255;
          noMax.data[imgOffset + 2] = 255;
        }
      }
    });

    // 8连同连接标记
    const trace = (edge: ImageData, noMax: ImageData, latitudes: number[], tl: number, i: number, j: number) => {
      const width = edge.width;
      const height = edge.height;
      const offset = j * width * 4 + i * 4;
      // 不在极大值中的不标记
      // 标记过的就不再重新标记
      if (noMax.data[offset] !== 255 || edge.data[offset] === 255) {
        return;
      }
      edge.data[offset] = 255;
      edge.data[offset + 1] = 255;
      edge.data[offset + 2] = 255;
      edge.data[offset + 3] = 255;

      // 邻域搜索
      for (let v = -1; v < 1; v++) {
        for (let u = -1; u < 1; u++) {
          const x = i + u;
          const y = j + v;
          if (x >= 0 && x < width && y >= 0 && y < height && latitudes[offset] > tl) {
            // 使用迭代
            trace(edge, noMax, latitudes, tl, u, v);
          }
        }
      }
    }

    // 使用高低阈值标记边缘
    const edge = new ImageData(width, height);
    const [minLat, maxLat] = gradLatitudes.reduce((pair, curr) => {
      pair[0] = Math.min(pair[0], curr);
      pair[1] = Math.max(pair[1], curr);
      return pair;
    }, [Infinity, -Infinity]);
    console.log('minLat, maxLat', minLat, maxLat);
    const range = maxLat - minLat;
    const thVal = this.thVal;
    const tlVal = thVal * .3;
    const th = minLat + thVal * range;
    const tl = minLat + tlVal * range;
    Array.from(this.horiImgDataGenerator(noMax))
      .forEach(info => {
        const idx = info.offset / 4;
        edge.data[info.offset + 3] = 255;
        // 极大值中大于高阈值，则选择为边缘
        if (info.r === 255 && gradLatitudes[idx] > th) {
          trace(edge, noMax, gradLatitudes, tl, info.i, info.j);
        }
      });
    // return edge;
    // return noMax;
    return this.fillGap(edge, gradAngles);
  }

  private isHori(radiant) {
    const lv1 = (22.5 / 180) * Math.PI;
    const lv2 = -lv1;
    const lv3 = Math.PI - lv1;
    const lv4 = -Math.PI + lv1;
    return (radiant >= 0 && radiant <= lv1) ||
      (radiant >= lv3 && radiant <= Math.PI) ||
      (radiant < 0 && radiant >= lv2) ||
      (radiant < lv4 && radiant >= -Math.PI)
  }

  private isVert(radiant) {
    const lv1 = (67.5 / 180) * Math.PI;
    const lv2 = Math.PI - lv1;
    const lv3 = -lv1;
    const lv4 = -Math.PI + lv1;
    return (radiant >= lv1 && radiant <= lv2) ||
      (radiant >= lv4 && radiant <= lv3);
  }

  private is45(radiant) {
    const lv1 = (22.5 / 180) * Math.PI;
    const lv2 = (67.5 / 180) * Math.PI;
    const lv3 = -Math.PI + lv1;
    const lv4 = -Math.PI + lv2;
    return (radiant >= lv1 && radiant <= lv2) ||
      (radiant >= lv3 && radiant <= lv4);
  }

  private fillGap(source: ImageData, radiants: number[]) {
    const width = source.width;
    const height = source.height;
    const res = new ImageData(width, height);
    const gapLen = 20;

    const fillArrGap = (offsets: number[], dir: 'x' | 'y') => {
      console.log('called', offsets);
      offsets.forEach(offset => {
        // res.data[offset] = 255;
        // // res.data[offset + 1] = 255;
        // // res.data[offset + 2] = 255;
        // res.data[offset + 3] = 255;
        if (dir === 'x') {
          res.data[offset] = 255;
        }
        else if (dir === 'y') {
          res.data[offset + 1] = 255;
        }
        res.data[offset + 3] = 255;
      });
    }

    const doFill = (arr: number[], offset: number, radiantFunc: Function, dir: 'x' | 'y') => {
      const idx = offset / 4;
      res.data[offset + 3] = 255;
      if (source.data[offset] === 255) {
        res.data[offset] = 255;
        res.data[offset + 1] = 255;
        res.data[offset + 2] = 255;
        // 线条沿x轴
        // if (this.isVert(radiants[idx])) {
        if (radiantFunc(radiants[idx])) {
          // 当前为标记点，且gap数组为空时，
          // 说明正在进入新的gap
          // 记录点位
          if (!arr.length) {
            arr.push(offset);
          } else {
            // 非空时，则检查数组长度
            // 可以填充时填充，然后清空数组
            if (arr.length < gapLen) {
              fillArrGap(arr, dir);
            }
            // 清空
            arr.splice(0, arr.length);
          }
        }
      } else {
        // 当前为背景，且数组已有值
        // 则填充
        if (arr.length) {
          arr.push(offset);
        }
      }

      return arr;
    }

    // x
    for (let j = 0; j < height; j++) {
      let arr = [];
      for (let i = 0; i < width; i++) {
        const offset = j * 4 * width + i * 4;
        arr = doFill(arr, offset, this.isVert, 'x');
      }
    }

    // y
    for (let i = 0; i < width; i++) {
      let arr = [];
      for (let j = 0; j < height; j++) {
        const offset = j * 4 * width + i * 4;
        arr = doFill(arr, offset, this.isHori, 'y');
      }
    }

    return res;
  }

  private showSobel(width: number, height: number, sobelLat: number[]) {
    const max = sobelLat.reduce((maxV, lat) => Math.max(maxV, lat), -Infinity);
    console.log(sobelLat);
    console.log('max', max);
    const tmp = new ImageData(width, height);
    const res = new ImageData(width, height);
    Array.from(this.horiImgDataGenerator(tmp))
      .forEach(info => {
        const offset = info.j * 4 * width + info.i * 4;
        const idx = info.j * width + info.i;
        const val = (sobelLat[idx] / max) * 255;
        res.data[offset] = val;
        res.data[offset + 1] = val;
        res.data[offset + 2] = val;
        res.data[offset + 3] = 255;
      });
    return res;
  }

  private sobelEdge(source: ImageData) {
    const rawData = source.data;
    const x = [];
    const y = [];
    const width = source.width;
    const height = source.height;
    const pixels = Array.from(this.horiImgDataGenerator(source));
    const getPixel = (data, width, x, y) => data[y * 4 * width + x * 4];
    let maxR = -Infinity;
    pixels.forEach(info => {
      maxR = Math.max(info.r, maxR);
      const leftX = Math.max(0, info.i - 1);
      const rightX = Math.min(width - 1, info.i + 1);
      const topY = Math.max(0, info.j - 1);
      const bottomY = Math.min(height - 1, info.j + 1);

      const topLeft = getPixel(rawData, width, leftX, topY);
      const top = getPixel(rawData, width, info.i, topY);
      const topRight = getPixel(rawData, width, rightX, topY);
      const left = getPixel(rawData, width, leftX, info.j);
      const middle = getPixel(rawData, width, info.i, info.j);
      const right = getPixel(rawData, width, rightX, info.j);
      const bottomLeft = getPixel(rawData, width, leftX, bottomY);
      const bottom = getPixel(rawData, width, info.i, bottomY);
      const bottomRight = getPixel(rawData, width, rightX, bottomY);

      x.push(
        topRight - topLeft + (right - left) * 2 + bottomRight - bottomLeft
      );
      y.push(
        bottomLeft - topLeft + (bottom - top) * 2 + bottomRight - topRight
      );
    });
    return {
      x, y
    };
  }

  /**
   * |x| + |y|
   * @param x 
   * @param y 
   * @returns 
   */
  private calcGradLatitude(x: number[], y: number[]) {
    return x.map((val, i) => Math.abs(val) + Math.abs(y[i]));
  }

  /**
   * arctan[y / x] in radians
   * @param x 
   * @param y 
   * @returns 
   */
  private calcGradAngle(x: number[], y: number[]) {
    return x.map((val, i) => Math.atan2(y[i], val));
  }

  private *horiImgDataGenerator(source: ImageData) {
    const data = source.data;
    const width = source.width;
    const height = source.height;

    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        const offset = j * 4 * width + i * 4;

        yield {
          r: data[offset],
          g: data[offset + 1],
          b: data[offset + 2],
          a: data[offset + 3],
          i, j,
          offset
        };
      }
    }
  }
}
