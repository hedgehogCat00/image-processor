import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { debounce, debounceTime } from 'rxjs/operators';
import { DefferedRenderingService } from './deffered-rendering.service';

@Component({
  selector: 'app-deffered-rendering',
  templateUrl: './deffered-rendering.component.html',
  styleUrls: ['./deffered-rendering.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [DefferedRenderingService]
})
export class DefferedRenderingComponent implements OnInit, AfterViewInit {
  @ViewChild('webgl') canvasRef: ElementRef;
  @ViewChild('rtPreview') rtPreviewRef: ElementRef<HTMLCanvasElement>;

  private _renderMode: string = 'foreward';
  public get renderMode(): string {
    return this._renderMode;
  }
  public set renderMode(v: string) {
    this._renderMode = v;
    if (this.compSrv) {
      if (v === 'foreward') {
        this.compSrv.setForwardRenderMode();
      } else {
        this.compSrv.setDefferedRenderMode();
      }
    }
  }


  constructor(
    private compSrv: DefferedRenderingService
  ) { }

  ngOnInit(): void {
  }

  ngAfterViewInit() {
    this.compSrv.init(this.canvasRef.nativeElement);
    this.compSrv.loadModel$('assets/models/monkey-head-2.fbx')
      .subscribe((model: any) => {
        console.log('model', model);
        // model.traverse(obj => {
        //   if (obj.isMesh) {
        //     obj.material = this.compSrv.testLambertMat;
        //   }
        // })
        this.compSrv.scene.add(model);
      });
    this.renderMode = 'foreward';

    this.initRTPreviewCanvas();
  }

  private initRTPreviewCanvas() {
    const canvas = this.rtPreviewRef.nativeElement;
    const prevCtx = canvas.getContext('2d');
    this.compSrv.rtPixels$
      // .pipe(
      //   debounceTime(500)
      // )
      .subscribe(info => {
        canvas.width = info.width;
        canvas.height = info.height;
        const imgData = prevCtx.getImageData(0, 0, canvas.width, canvas.height);
        imgData.data.set(info.buffer);
        prevCtx.putImageData(imgData, 0, 0);
      });
  }
}
