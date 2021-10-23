import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CannyEdgeComponent } from './canny-edge.component';

describe('CannyEdgeComponent', () => {
  let component: CannyEdgeComponent;
  let fixture: ComponentFixture<CannyEdgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CannyEdgeComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CannyEdgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
