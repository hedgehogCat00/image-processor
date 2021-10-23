import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConnectAreasComponent } from './connect-areas.component';

describe('ConnectAreasComponent', () => {
  let component: ConnectAreasComponent;
  let fixture: ComponentFixture<ConnectAreasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ConnectAreasComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ConnectAreasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
