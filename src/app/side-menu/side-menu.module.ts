import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SideMenuComponent } from './side-menu.component';
import {MatTreeModule} from '@angular/material/tree';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [SideMenuComponent],
  imports: [
    CommonModule,
    RouterModule,
    MatTreeModule,
    MatButtonModule,
  ],
  exports: [SideMenuComponent]
})
export class SideMenuModule { }
