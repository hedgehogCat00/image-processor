import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SideMenuModule } from './side-menu/side-menu.module';
import { TopToolbarModule } from './top-toolbar/top-toolbar.module';
import { MatSidenavModule } from '@angular/material/sidenav';
import { GlobalService } from './global.service';
import { ConnectAreasModule } from './routes/connect-areas/connect-areas.module';
import { HttpClientModule } from '@angular/common/http';
import { SplitUniteRegionModule } from './routes/split-unite-region/split-unite-region.module';
import { ImageSpliteModule } from './routes/image-splite/image-splite.module';

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    HttpClientModule,
    MatSidenavModule,
    SideMenuModule,
    TopToolbarModule,
    ConnectAreasModule,
    SplitUniteRegionModule,
    ImageSpliteModule
  ],
  providers: [GlobalService],
  bootstrap: [AppComponent]
})
export class AppModule { }
