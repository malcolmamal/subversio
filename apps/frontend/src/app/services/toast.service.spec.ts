import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  it('should be created', () => {
    expect(service).toBeDefined();
  });

  it('should add success toast', () => {
    service.success('Success message');
    const toasts = service.toastsSignal();
    expect(toasts.length).toBe(1);
    expect(toasts[0].message).toBe('Success message');
    expect(toasts[0].type).toBe('success');
  });

  it('should add error toast', () => {
    service.error('Error message');
    const toasts = service.toastsSignal();
    expect(toasts[0].type).toBe('error');
  });

  it('should remove toast', () => {
    service.info('Info');
    const id = service.toasts()[0].id;
    service.remove(id);
    expect(service.toasts().length).toBe(0);
  });
});
