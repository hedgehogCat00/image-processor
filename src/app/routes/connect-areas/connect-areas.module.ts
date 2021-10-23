import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConnectAreasComponent } from './connect-areas.component';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [{ path: '', component: ConnectAreasComponent }]

@NgModule({
  declarations: [ConnectAreasComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ],
  exports: [ConnectAreasComponent]
})
export class ConnectAreasModule { }
