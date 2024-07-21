import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ProceduralAnimRoutingModule } from './procedural-anim-routing.module';
import { FollowBonesComponent } from './follow-bones/follow-bones.component';


@NgModule({
  declarations: [
    FollowBonesComponent
  ],
  imports: [
    CommonModule,
    ProceduralAnimRoutingModule
  ]
})
export class ProceduralAnimModule { }
