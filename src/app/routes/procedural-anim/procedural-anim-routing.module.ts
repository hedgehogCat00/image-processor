import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { FollowBonesComponent } from './follow-bones/follow-bones.component';

const routes: Routes = [{
  path: 'follow-bones',
  component: FollowBonesComponent
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProceduralAnimRoutingModule { }
