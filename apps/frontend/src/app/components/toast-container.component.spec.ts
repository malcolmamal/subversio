import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastContainerComponent } from './toast-container.component';
import { ToastService } from '../services/toast.service';
import { signal } from '@angular/core';

describe('ToastContainerComponent', () => {
  let component: ToastContainerComponent;
  let fixture: ComponentFixture<ToastContainerComponent>;
  let mockToastService: any;

  beforeEach(async () => {
    mockToastService = {
      toastsSignal: signal([{ id: 1, message: 'Test', type: 'info' }]),
      remove: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ToastContainerComponent],
      providers: [{ provide: ToastService, useValue: mockToastService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ToastContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display toasts', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Test');
  });

  it('should call remove when clicking a toast', () => {
    const toastDiv = fixture.nativeElement.querySelector('.toast');
    toastDiv.click();
    expect(mockToastService.remove).toHaveBeenCalledWith(1);
  });
});
