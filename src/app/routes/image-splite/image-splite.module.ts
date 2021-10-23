import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OtsuSplitComponent } from './otsu-split/otsu-split.component';
import { RouterModule, Routes } from '@angular/router';
import { CannyEdgeComponent } from './canny-edge/canny-edge.component';
import { FormsModule } from '@angular/forms';

const routes: Routes = [{
  path: 'image-split',
  children: [{
    path: 'otsu',
    component: OtsuSplitComponent
  }, {
    path: 'canny',
    component: CannyEdgeComponent
  }]
}];

@NgModule({
  declarations: [OtsuSplitComponent, CannyEdgeComponent],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(routes)
  ],
  exports: [OtsuSplitComponent, CannyEdgeComponent]
})
export class ImageSpliteModule { }
