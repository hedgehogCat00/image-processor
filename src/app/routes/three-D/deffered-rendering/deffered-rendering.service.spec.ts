import { TestBed } from '@angular/core/testing';

import { DefferedRenderingService } from './deffered-rendering.service';

describe('DefferedRenderingService', () => {
  let service: DefferedRenderingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DefferedRenderingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
