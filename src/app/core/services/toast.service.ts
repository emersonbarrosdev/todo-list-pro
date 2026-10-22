import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'danger';
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  toasts = signal<Toast[]>([]);

  show(toast: Omit<Toast, 'id'>): string {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, duration: 4000, ...toast };
    this.toasts.update((current) => [...current, newToast]);

    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, newToast.duration);
    }

    return id;
  }

  success(message: string, duration = 3500) {
    return this.show({ message, type: 'success', duration });
  }

  error(message: string, duration = 5000) {
    return this.show({ message, type: 'danger', duration });
  }

  info(message: string, duration = 3500) {
    return this.show({ message, type: 'info', duration });
  }

  dismiss(id: string) {
    this.toasts.update((current) => current.filter((t) => t.id !== id));
  }
}
