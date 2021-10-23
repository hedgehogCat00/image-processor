import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OtsuSplitComponent } from './otsu-split.component';

describe('OtsuSplitComponent', () => {
  let component: OtsuSplitComponent;
  let fixture: ComponentFixture<OtsuSplitComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OtsuSplitComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OtsuSplitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
