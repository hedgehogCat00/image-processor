import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LifeGameComponent } from './life-game.component';

describe('LifeGameComponent', () => {
  let component: LifeGameComponent;
  let fixture: ComponentFixture<LifeGameComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LifeGameComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LifeGameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
