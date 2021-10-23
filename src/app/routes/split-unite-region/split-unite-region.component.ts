import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { RegionTree } from './region-tree';

@Component({
  selector: 'app-split-unite-region',
  templateUrl: './split-unite-region.component.html',
  styleUrls: ['./split-unite-region.component.less']
})
export class SplitUniteRegionComponent implements OnInit, AfterViewInit {
  @ViewChild('sourceCanvas', { static: true }) sourceCanvasRef: ElementRef<HTMLCanvasElement>;
  imgs: { src: string }[] = [];

  constructor() { }

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

      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = img.width;
      tmpCanvas.height = img.height;
      const tmpCtx = tmpCanvas.getContext('2d');
      const tree = new RegionTree(ctx, tmpCtx, img.width, img.height, 0, 0, 16);
      tree.generate();
      this.imgs = [{ src: tmpCanvas.toDataURL() }];
      console.log(tree);
    }
    img.src = 'assets/images/菌落1.jpg';
  }


}
