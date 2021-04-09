import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CodeEditorComponent } from './code-editor.component';
import {OverlayModule} from '@angular/cdk/overlay';
import { MatSelectModule } from '@angular/material/select';

@NgModule({
  declarations: [CodeEditorComponent],
  imports: [
    CommonModule,
    OverlayModule,
    MatSelectModule
  ],
  exports: [CodeEditorComponent]
})
export class CodeEditorModule { }
