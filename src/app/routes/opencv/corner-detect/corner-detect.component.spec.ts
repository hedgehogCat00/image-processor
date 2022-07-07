import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CornerDetectComponent } from './corner-detect.component';

describe('CornerDetectComponent', () => {
  let component: CornerDetectComponent;
  let fixture: ComponentFixture<CornerDetectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CornerDetectComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CornerDetectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
