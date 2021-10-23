import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AstarComponent } from './astar.component';
import { AstarRoutingModule } from './astar-routing.module';

@NgModule({
  declarations: [AstarComponent],
  imports: [
    CommonModule,
    AstarRoutingModule
  ]
})
export class AstarModule { }
