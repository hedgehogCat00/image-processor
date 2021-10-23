import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DefferedRenderingComponent } from './deffered-rendering.component';

describe('DefferedRenderingComponent', () => {
  let component: DefferedRenderingComponent;
  let fixture: ComponentFixture<DefferedRenderingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DefferedRenderingComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DefferedRenderingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
