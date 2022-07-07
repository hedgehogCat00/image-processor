import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
// import * as cv from 'opencv4js';

declare const cv;
const cvInst = cv()
// const cv = require('assets/js/opencv_js.js')

@Component({
  selector: 'app-corner-detect',
  templateUrl: './corner-detect.component.html',
  styleUrls: ['./corner-detect.component.less']
})
export class CornerDetectComponent implements OnInit, AfterViewInit {
  sourceImgSrc: string;

  @ViewChild('sourceImg') sourceImg: ElementRef<HTMLImageElement>;
  @ViewChild('outputCvs') outputCvs: ElementRef<HTMLCanvasElement>;

  constructor() { }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {

  }

  loadImg(evt: Event) {
    const file = (evt.target as HTMLInputElement).files[0];
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      this.sourceImgSrc = reader.result as string;
    }
  }

  sourceImgLoaded() {
    if (!this.sourceImgSrc) {
      return
    }

    const src = cvInst.imread(this.sourceImg.nativeElement);
    const dst = new cvInst.Mat()
    cvInst.cvtColor(src, dst, cvInst.COLOR_RGB2GRAY)
    cvInst.imshow(this.outputCvs.nativeElement, dst)
    src.delete()
    dst.delete()
  }
}
