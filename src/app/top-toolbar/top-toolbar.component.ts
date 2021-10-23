import { ChangeDetectionStrategy, Component, EventEmitter, OnInit, Output } from '@angular/core';

@Component({
  selector: 'top-toolbar',
  templateUrl: './top-toolbar.component.html',
  styleUrls: ['./top-toolbar.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TopToolbarComponent implements OnInit {
  @Output() btnClicked = new EventEmitter();
  constructor() { }

  ngOnInit(): void {
  }

  onBtnClicked() {
    this.btnClicked.emit();
  }
}
