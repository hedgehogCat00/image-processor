import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CodeEditorComponent } from './code-editor.component';
import { OverlayModule } from '@angular/cdk/overlay';
import { MatSelectModule } from '@angular/material/select';
import { RouterModule, Routes } from '@angular/router';
import { InfluxdbEditorComponent } from './influxdb-editor/influxdb-editor.component';

const routes: Routes = [{
  path: '', component: CodeEditorComponent
}, {
  path: 'influxDB', component: InfluxdbEditorComponent
}]

@NgModule({
  declarations: [CodeEditorComponent, InfluxdbEditorComponent],
  imports: [
    RouterModule.forChild(routes),
    CommonModule,
    OverlayModule,
    MatSelectModule
  ],
  exports: [CodeEditorComponent]
})
export class CodeEditorModule { }
