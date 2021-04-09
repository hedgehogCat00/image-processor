import { NgModule } from '@angular/core';
import { AstarComponent } from './astar.component';
import { RouterModule, Routes } from '@angular/router';

const routes:Routes = [
  {path: '', component: AstarComponent}
];

@NgModule({
  imports: [
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class AstarRoutingModule { }
