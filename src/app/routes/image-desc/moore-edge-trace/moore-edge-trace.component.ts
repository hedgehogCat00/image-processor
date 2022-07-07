import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { image2BW, imgBWThreshold, traverseImgDS } from 'src/app/tools/image-common';

function UseState(val: number) {
  return function (target: any, key: string) {
    target[key] = val;
    target[`set${key.replace(/^\w/, c => c.toUpperCase())}`] = v => target[key] = v;
  }
}

function UseEffect() {
  return function (target, key: string, descriptor) {
    const rawNgOnInit = target.ngOnInit;
    target.ngOnInit = function () {
      rawNgOnInit.apply(target);
      descriptor.value.apply(target);
    }.bind(target)

    const rawNgAfterviewChecked = target.ngAfterViewChecked;
    if (rawNgAfterviewChecked) {
      target.ngAfterViewChecked = function () {
        rawNgAfterviewChecked.apply(target);
        descriptor.value.apply(target);
      }.bind(target)
    }

  }
}


@Component({
  selector: 'app-moore-edge-trace',
  templateUrl: './moore-edge-trace.component.html',
  styleUrls: ['./moore-edge-trace.component.less']
})
export class MooreEdgeTraceComponent implements OnInit {
  @ViewChild('rawImg') rawImg: ElementRef<HTMLCanvasElement>;
  @ViewChild('distImg') distImg: ElementRef<HTMLCanvasElement>;

  @UseState(0)
  count;
  setCount;

  @UseEffect()
  onEffect() { console.log(this.count) }

  constructor() { }

  ngOnInit(): void {
  }

  loadImg(evt: InputEvent) {
    const file = (<HTMLInputElement>evt.target).files[0];
    const image = new Image();
    image.onload = () => {
      const rawCvs = this.rawImg.nativeElement;
      rawCvs.width = image.width;
      rawCvs.height = image.height;
      const rawCtx = rawCvs.getContext('2d');
      rawCtx.drawImage(image, 0, 0);

      const width = rawCvs.width;
      const height = rawCvs.height;
      const bwImgDS = imgBWThreshold(image2BW(rawCtx.getImageData(0, 0, width, height)), 220, true)
      // const bwImgDS = image2BW(rawCtx.getImageData(0, 0, width, height))

      const distCvs = this.distImg.nativeElement;
      const distCtx = distCvs.getContext('2d');
      distCvs.width = image.width;
      distCvs.height = image.height;
      distCtx.putImageData(bwImgDS, 0, 0);

      const { res: traceRes, width: traceWidth, height: traceHeight } = this.trace(distCtx.getImageData(0, 0, width, height));
      this.drawTrace(traceRes, traceWidth, traceHeight);
      console.log(traceRes);
    }

    const reader = new FileReader();
    reader.onload = () => {
      image.src = reader.result as string;
    }
    reader.readAsDataURL(file);

  }

  private trace(source: ImageData) {
    const width = source.width;
    const height = source.height;
    const cvs = document.createElement('canvas');
    cvs.width = width + 2;
    cvs.height = height + 2;
    const ctx = cvs.getContext('2d');

    // 添加边缘
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, cvs.width, cvs.height);
    ctx.putImageData(source, 1, 1);
    const imgDS = ctx.getImageData(0, 0, cvs.width, cvs.height);
    // traverseImgDS(imgDS, ({ offset, top, topRight, right, bottomRight, bottom, bottomLeft, left, topLeft }) => {

    // })
    // 寻找第一个像素
    const dsLen = imgDS.data.length;
    let b0 = -1;
    for (let i = 0; i < dsLen; i += 4) {
      if (imgDS.data[i] > 0) {
        b0 = i;
        break;
      }
    }

    if (b0 <= 0) {
      console.log('not found');
      return;
    }

    let c0 = b0 - 4;
    /**
     * [[7, 0, 1],
     *  [6,  , 2],
     *  [5, 4, 3]
     * ]
     */
    let code = 6;
    let c1, b1, c = c0, b = b0;
    const maxIter = 10e4;
    const imgDSWidhtOffset = imgDS.width * 4;
    const res = [b0];
    const codeNextMap = new Map([
      [0, 6], [1, 6],
      [2, 0], [3, 0],
      [4, 2], [5, 2],
      [6, 4], [7, 4]
    ])
    let iterCount = 0;

    const getPixelFromCode = (currPixel, code) => {
      switch (code) {
        case 0:
          return currPixel - 4 * imgDS.width; break;
        case 1:
          return currPixel - 4 * imgDS.width + 4; break;
        case 2:
          return currPixel + 4; break;
        case 3:
          return currPixel + 4 * imgDS.width + 4; break;
        case 4:
          return currPixel + 4 * imgDS.width; break;
        case 5:
          return currPixel + 4 * imgDS.width - 4; break;
        case 6:
          return currPixel - 4; break;
        case 7:
          return currPixel - 4 * imgDS.width - 4; break;
      }
    }
    do {
      let curr;
      // 找到 8 近邻内下一个点
      do {
        code = (code + 1) % 8;
        curr = getPixelFromCode(b, code);

        // 找到
        if (imgDS.data[curr] > 0) {
          break;
        }
      } while (curr !== c)

      if (curr === c) {
        console.error('only single pixel');
        break;
      }

      // 记录找到的点
      res.push(curr);
      b = curr;
      // 回退
      code = codeNextMap.get(code);
      // 记录 c
      c = getPixelFromCode(b, code);
      // // 指向 c 的下一个
      // code = (code + 1) % 8;
    } while (!(b === b0 && code === 6) && iterCount <= maxIter)

    if (iterCount == maxIter) {
      console.error('hit max iteration');
    }

    return { res, width: cvs.width, height: cvs.height };
  }

  private drawTrace(traceRes: number[], width: number, height: number) {
    const cvs = this.distImg.nativeElement;
    cvs.width = width;
    cvs.height = height;

    const ctx = cvs.getContext('2d');
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    const imgDS = ctx.getImageData(0, 0, width, height);
    traverseImgDS(imgDS, ({ offset }) => {
      if (traceRes.includes(offset)) {
        // imgDS.data[offset] = 255;
        imgDS.data[offset + 1] = 255;
        // imgDS.data[offset + 2] = 0;
        imgDS.data[offset + 3] = 255;
      }
    })
    ctx.putImageData(imgDS, 0, 0)
  }
}
