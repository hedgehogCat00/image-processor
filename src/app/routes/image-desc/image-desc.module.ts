import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ImageDescRoutingModule } from './image-desc-routing.module';
import { MooreEdgeTraceComponent } from './moore-edge-trace/moore-edge-trace.component';


@NgModule({
  declarations: [MooreEdgeTraceComponent],
  imports: [
    CommonModule,
    ImageDescRoutingModule
  ]
})
export class ImageDescModule { }
