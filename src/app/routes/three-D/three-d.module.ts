import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThreeDRoutingModule } from './three-d.routing.module';
import { DefferedRenderingComponent } from './deffered-rendering/deffered-rendering.component';
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    DefferedRenderingComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    MatRadioModule,
    ThreeDRoutingModule
  ]
})
export class ThreeDModule { }
