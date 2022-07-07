import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CornerDetectComponent } from './corner-detect/corner-detect.component';
import { OpencvComponent } from './opencv.component';

const routes: Routes = [{
  path: '',
  component: OpencvComponent,
  children: [{
    path: 'corner-detect',
    component: CornerDetectComponent
  }]
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OpencvRoutingModule { }
