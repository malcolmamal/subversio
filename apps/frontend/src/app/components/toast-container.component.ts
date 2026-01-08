import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      @for (toast of toastService.toastsSignal(); track toast.id) {
        <div class="toast" [class]="toast.type" (click)="toastService.remove(toast.id)">
          {{ toast.message }}
        </div>
      }
    </div>
  `,
  styles: [
    `
      .toast-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .toast {
        padding: 12px 24px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: slideIn 0.3s ease-out;
        min-width: 200px;
      }
      .success {
        background-color: #10b981;
      }
      .error {
        background-color: #ef4444;
      }
      .info {
        background-color: #3b82f6;
      }

      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `,
  ],
})
export class ToastContainerComponent {
  public toastService = inject(ToastService);
}
