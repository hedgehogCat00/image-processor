import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SplitUniteRegionComponent } from './split-unite-region.component';

describe('SplitUniteRegionComponent', () => {
  let component: SplitUniteRegionComponent;
  let fixture: ComponentFixture<SplitUniteRegionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SplitUniteRegionComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SplitUniteRegionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
