import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CodeEditorModule } from './code-editor/code-editor.module';
import { MatSidenavModule } from '@angular/material/sidenav';
import { SideMenuModule } from './side-menu/side-menu.module';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    MatSidenavModule,
    SideMenuModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
