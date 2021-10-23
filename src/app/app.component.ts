import { Component } from '@angular/core';
import { GlobalService } from './global.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less']
})
export class AppComponent {
  constructor(
    private globalSrv: GlobalService
  ) {

  }

  onSidenavToggled() {
    this.globalSrv.layoutChanged();
  }
}
