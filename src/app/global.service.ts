import { EventEmitter, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GlobalService {
  layoutChangedEvt = new EventEmitter();

  constructor() { }

  layoutChanged() {
    this.layoutChangedEvt.emit();
  }
}
