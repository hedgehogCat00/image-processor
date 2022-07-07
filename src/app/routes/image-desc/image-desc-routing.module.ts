import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MooreEdgeTraceComponent } from './moore-edge-trace/moore-edge-trace.component';

const routes: Routes = [{
  path: '',
  children: [{
    path: 'moore', component: MooreEdgeTraceComponent
  }]
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ImageDescRoutingModule { }
