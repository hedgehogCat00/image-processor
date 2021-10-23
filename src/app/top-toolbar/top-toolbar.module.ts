import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TopToolbarComponent } from './top-toolbar.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';

@NgModule({
  declarations: [
    TopToolbarComponent
  ],
  exports: [TopToolbarComponent],
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule
  ]
})
export class TopToolbarModule { }
