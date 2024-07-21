import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FollowBonesComponent } from './follow-bones.component';

describe('FollowBonesComponent', () => {
  let component: FollowBonesComponent;
  let fixture: ComponentFixture<FollowBonesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FollowBonesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FollowBonesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
