import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { rgb2hsv } from 'src/app/tools/image-common';
import { dilate, morphClose, morphOpen } from 'src/app/tools/morphology';

@Component({
  selector: 'app-connect-areas',
  templateUrl: './connect-areas.component.html',
  styleUrls: ['./connect-areas.component.less']
})
export class ConnectAreasComponent implements OnInit, AfterViewInit {
  @ViewChild('sourceCanvas', { static: true }) sourceCanvasRef: ElementRef<HTMLCanvasElement>;
  @ViewChild('distCanvas', { static: true }) distCanvasRef: ElementRef<HTMLCanvasElement>;

  conns: any[] = [];

  constructor(
    private http: HttpClient
  ) { }

  ngOnInit(): void {
  }

  ngAfterViewInit() {
    const img = new Image();
    img.onload = () => {
      const sourceCvs = this.sourceCanvasRef.nativeElement;
      sourceCvs.width = img.width;
      sourceCvs.height = img.height;
      const ctx = sourceCvs.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const distCvs = this.distCanvasRef.nativeElement;
      distCvs.width = img.width;
      distCvs.height = img.height;
      const distCtx = distCvs.getContext('2d');
      distCtx.drawImage(img, 0, 0);

      setTimeout(() => {
        let distImgData = distCtx.getImageData(0, 0, img.width, img.height);
        distImgData = this.gaussian(distImgData);
        distImgData = this.pickMashroom(distImgData);

        const kernel = [
          [1, 1, 1],
          [1, 1, 1],
          [1, 1, 1],
        ];
        distImgData = morphOpen(distImgData, kernel);
        distImgData = morphClose(distImgData, kernel);

        const connections = this.findConnections(distImgData);
        console.log(connections);

        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = img.width;
        tmpCanvas.height = img.height;
        const tmpCtx = tmpCanvas.getContext('2d');
        this.conns = connections.map(conn => {
          tmpCtx.putImageData(conn.img, 0, 0);
          const src = tmpCanvas.toDataURL();
          return {
            src
          }
        });

        distCtx.putImageData(distImgData, 0, 0);
      }, 1);

    }
    img.src = 'assets/images/菌落1.jpg';

  }

  private pickMashroom(imgData: ImageData) {
    const width = imgData.width;
    const heigth = imgData.height;
    const distImgData = new ImageData(width, heigth);
    for (let j = 0; j < heigth; j++) {
      for (let i = 0; i < width; i++) {
        const offsetH = j * 4 * width;
        const offsetW = i * 4;
        const offset = offsetH + offsetW;

        const R = imgData.data[offset];
        const G = imgData.data[offset + 1];
        const B = imgData.data[offset + 2];

        // const RVal = Math.exp(R);
        // const GVal = Math.exp(G);
        // const BVal = Math.exp(B);
        // const RPercent = RVal / (RVal + GVal + BVal);

        distImgData.data[offset + 3] = 255;
        // if (R >= 61 && G <= 43 && B <= 43 && Math.abs(G - B) <= 5) {
        const { hAngle, v } = rgb2hsv(R, G, B);
        if (
          ((0 <= hAngle && hAngle <= 5) || (355 <= hAngle && hAngle <= 360)) &&
          v >= .2
        ) {
          // if (RPercent >= 0.99) {
          distImgData.data[offset] = 255;
          distImgData.data[offset + 1] = 255;
          distImgData.data[offset + 2] = 255;
        } else {
          distImgData.data[offset] = 0;
          distImgData.data[offset + 1] = 0;
          distImgData.data[offset + 2] = 0;
        }
      }
    }

    return distImgData;
  }

  private gaussian(source: ImageData) {
    const kernelSize = 5;
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

  private bitImgEquals(source1: ImageData, source2: ImageData) {
    const width = source1.width;
    const height = source1.height;
    let equal = true;

    for (let j = 0; j < height && equal; j++) {
      for (let i = 0; i < width && equal; i++) {
        const hOffset = j * 4 * width;
        const wOffset = i * 4;
        const offset = hOffset + wOffset;

        equal = source1.data[offset] === source2.data[offset];
      }
    }

    return equal;
  }

  /**
   * source1 - source2
   * @param source1 
   * @param source2 
   */
  private bitImgSubs(source1: ImageData, source2: ImageData) {
    const width = source1.width;
    const height = source1.height;
    const res = new ImageData(width, height);

    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        const hOffset = j * 4 * width;
        const wOffset = i * 4;
        const offset = hOffset + wOffset;

        if (source2.data[offset] > 0) {
          res.data[offset] = 0;
        } else {
          res.data[offset] = source1.data[offset];
        }
        res.data[offset + 3] = 255;
      }
    }

    return res;
  }

  /**
   * source1 && source2
   * @param source1 
   * @param source2 
   */
  private bitImgAnd(source1: ImageData, source2: ImageData) {
    const width = source1.width;
    const height = source1.height;
    const res = new ImageData(width, height);

    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        const hOffset = j * 4 * width;
        const wOffset = i * 4;
        const offset = hOffset + wOffset;

        res.data[offset] = source1.data[offset] > 0 && source2.data[offset] > 0 ? 255 : 0;
        res.data[offset + 3] = 255;
      }
    }

    return res;
  }

  private copy(source: ImageData) {
    const res = new ImageData(source.width, source.height);
    source.data.forEach((val, i) => res.data[i] = val);
    return res;
  }

  private findConnections(source: ImageData) {
    let workingImg = this.copy(source);
    const width = source.width;
    const height = source.height;
    const res: { label: string; img: ImageData }[] = [];
    // const dilateKernel = [
    //   [1, 1, 1, 1, 1],
    //   [1, 1, 1, 1, 1],
    //   [1, 1, 1, 1, 1],
    //   [1, 1, 1, 1, 1],
    //   [1, 1, 1, 1, 1],
    // ];
    const dilateKernel = [
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ];

    const getConn = (i: number, j: number) => {
      let connImg = new ImageData(width, height);
      const hOffset = j * 4 * width;
      const wOffset = i * 4;
      const offset = hOffset + wOffset;

      connImg.data[offset] = 255;
      connImg.data[offset + 3] = 255;

      let prevConnImg;
      do {
        prevConnImg = connImg;
        connImg = this.bitImgAnd(source, dilate(connImg, dilateKernel));
      } while (!this.bitImgEquals(prevConnImg, connImg))

      return connImg;
    }

    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        const hOffset = j * 4 * width;
        const wOffset = i * 4;
        const offset = hOffset + wOffset;
        if (workingImg.data[offset] === 0) {
          continue;
        }
        if (res.length > 10) {
          break;
        }
        const connPartImg = getConn(i, j);
        workingImg = this.bitImgSubs(workingImg, connPartImg);
        console.log('Found one connection', res.length);
        res.push({
          label: res.length + '',
          img: connPartImg
        });
      }
    }

    return res;
  }
}
