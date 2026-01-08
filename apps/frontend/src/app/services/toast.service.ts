import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private toasts = signal<Toast[]>([]);
  public readonly toastsSignal = this.toasts.asReadonly();
  private nextId = 0;

  show(message: string, type: ToastType = 'info', duration: number = 3000) {
    const id = this.nextId++;
    const toast: Toast = { id, message, type };
    this.toasts.update((t) => [...t, toast]);

    setTimeout(() => {
      this.remove(id);
    }, duration);
  }

  success(message: string) {
    this.show(message, 'success');
  }

  error(message: string) {
    this.show(message, 'error');
  }

  info(message: string) {
    this.show(message, 'info');
  }

  remove(id: number) {
    this.toasts.update((t) => t.filter((toast) => toast.id !== id));
  }
}
