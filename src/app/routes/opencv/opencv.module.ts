import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { OpencvRoutingModule } from './opencv-routing.module';
import { OpencvComponent } from './opencv.component';
import { CornerDetectComponent } from './corner-detect/corner-detect.component';


@NgModule({
  declarations: [OpencvComponent, CornerDetectComponent],
  imports: [
    CommonModule,
    OpencvRoutingModule
  ]
})
export class OpencvModule { }
