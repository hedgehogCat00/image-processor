import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { image2BW } from 'src/app/tools/image-common';

@Component({
  selector: 'app-otsu-split',
  templateUrl: './otsu-split.component.html',
  styleUrls: ['./otsu-split.component.less']
})
export class OtsuSplitComponent implements OnInit {
  @ViewChild('distCanvas') distCanvasRef: ElementRef<HTMLCanvasElement>;
  sourceImageSrc: string;

  constructor() { }

  ngOnInit(): void {
  }

  loadImage(evt: Event) {
    const ipt = evt.target as HTMLInputElement;
    const file = ipt.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      this.sourceImageSrc = reader.result as string;
      // console.log('Result', reader.result);
      this.load2Canvas();
    };
    reader.readAsDataURL(file);
  }

  load2Canvas() {
    const cvs = this.distCanvasRef.nativeElement;
    const ctx = cvs.getContext('2d');

    const image = new Image();
    image.onload = () => {
      cvs.width = image.width;
      cvs.height = image.height;
      ctx.drawImage(image, 0, 0);
      this.ostu(ctx, cvs.width, cvs.height);
    }
    image.src = this.sourceImageSrc;
  }

  private ostu(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const imgData = ctx.getImageData(0, 0, width, height);
    const bwImgData = image2BW(imgData);
    const histogram = this.getBWHistogram(bwImgData);

    const total = histogram.reduce((res, val) => res + val, 0);
    const pks = histogram.map(val => val / total);
    // 获取累加概率
    const Pks = pks.reduce((res, val, i) => {
      if (i > 0) {
        const lastVal = res[i - 1];
        res.push(val + lastVal);
      } else {
        res.push(val);
      }
      return res;
    }, []);

    const mg = histogram.reduce((res, _, i) => res + i * pks[i], 0);
    const sigmaG = histogram.reduce((res, _, i) => res + Math.pow(i - mg, 2) * pks[i], 0);
    const sigmaB = Array(256).fill(0);
    // 计算sigmaB
    for (let i = 1, end = pks.length - 1; i < end; i++) {
      const P1 = Pks[i];
      const P2 = 1 - P1;

      // 计算m1
      let m1 = 0;
      for (let t = 0; t <= i; t++) {
        m1 += t * pks[t];
      }
      m1 /= P1;

      // 计算m2
      let m2 = 0;
      for (let t = i + 1; t < 256; t++) {
        m2 += t * pks[t];
      }
      m2 /= P2;

      sigmaB[i] = P1 * Math.pow(m1 - mg, 2) + P2 * Math.pow(m2 - mg, 2);
    }

    let maxIdx = -Infinity;
    let maxSigmaB = -Infinity;
    sigmaB.forEach((val, i) => {
      if (val > maxSigmaB) {
        maxIdx = i;
        maxSigmaB = val;
      }
    });

    const k = maxIdx;
    const n = maxSigmaB / sigmaG;

    const distImgData = this.threholdBW(bwImgData, k);
    ctx.putImageData(distImgData, 0, 0);
    console.log('k =' + k, 'n =', n);
  }

  private threholdBW(source: ImageData, threshold: number) {
    const width = source.width;
    const height = source.height;
    const res = new ImageData(width, height);

    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        const offset = j * 4 * width + i * 4;
        const color = source.data[offset];
        const val = color >= threshold ? 255 : 0;
        res.data[offset] = val;
        res.data[offset + 1] = val;
        res.data[offset + 2] = val;
        res.data[offset + 3] = 255;
      }
    }
    return res;
  }

  private getBWHistogram(source: ImageData) {
    const width = source.width;
    const height = source.height;

    const result = Array(256).fill(0);
    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        const offset = j * 4 * width + i * 4;
        const val = source.data[offset];
        result[val] += 1;
      }
    }
    return result;
  }
}
