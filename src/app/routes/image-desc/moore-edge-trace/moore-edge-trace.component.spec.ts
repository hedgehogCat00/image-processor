import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MooreEdgeTraceComponent } from './moore-edge-trace.component';

describe('MooreEdgeTraceComponent', () => {
  let component: MooreEdgeTraceComponent;
  let fixture: ComponentFixture<MooreEdgeTraceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MooreEdgeTraceComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MooreEdgeTraceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
