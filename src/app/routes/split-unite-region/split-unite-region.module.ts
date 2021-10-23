import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SplitUniteRegionComponent } from './split-unite-region.component';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [{
  path: '', component: SplitUniteRegionComponent
}]

@NgModule({
  declarations: [SplitUniteRegionComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ],
  exports: [SplitUniteRegionComponent]
})
export class SplitUniteRegionModule { }
