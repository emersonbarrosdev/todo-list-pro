import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Toast, ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container" aria-live="polite">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast-item" [ngClass]="'toast-' + toast.type">
          <span class="toast-message">{{ toast.message }}</span>
          @if (toast.actionLabel && toast.onAction) {
            <button
              class="toast-action"
              (click)="handleAction(toast)"
              type="button"
            >
              {{ toast.actionLabel }}
            </button>
          }
          <button
            class="toast-close"
            (click)="toastService.dismiss(toast.id)"
            aria-label="Fechar notificação"
            type="button"
          >
            ✕
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-width: 380px;
      pointer-events: none;
    }

    .toast-item {
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border-radius: var(--radius-sm);
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text);
      box-shadow: var(--shadow-md);
      font-size: 0.875rem;
      animation: toast-in 160ms ease-out;
    }

    .toast-success {
      border-left: 3px solid var(--success);
    }
    .toast-danger {
      border-left: 3px solid var(--danger);
    }
    .toast-warning {
      border-left: 3px solid var(--warning);
    }
    .toast-info {
      border-left: 3px solid var(--primary);
    }

    .toast-message {
      flex: 1;
    }

    .toast-action {
      background: var(--primary-soft);
      color: var(--accent);
      border-radius: var(--radius-xs);
      padding: 0.25rem 0.5rem;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      transition: background var(--transition-fast);
    }

    .toast-action:hover {
      background: var(--primary);
      color: #FFFFFF;
    }

    .toast-close {
      color: var(--text-muted);
      cursor: pointer;
      font-size: 0.875rem;
      padding: 0.1rem 0.3rem;
      transition: color var(--transition-fast);
    }

    .toast-close:hover {
      color: var(--text);
    }

    @keyframes toast-in {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class ToastComponent {
  toastService = inject(ToastService);

  handleAction(toast: Toast) {
    if (toast.onAction) {
      toast.onAction();
    }
    this.toastService.dismiss(toast.id);
  }
}
