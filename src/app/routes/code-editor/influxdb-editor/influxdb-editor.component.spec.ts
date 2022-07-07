import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InfluxdbEditorComponent } from './influxdb-editor.component';

describe('InfluxdbEditorComponent', () => {
  let component: InfluxdbEditorComponent;
  let fixture: ComponentFixture<InfluxdbEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InfluxdbEditorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InfluxdbEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
