import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // If still loading session from storage, wait a brief moment
  if (auth.isLoading()) {
    let attempts = 0;
    while (auth.isLoading() && attempts < 20) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      attempts++;
    }
  }

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/auth']);
};

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoading()) {
    let attempts = 0;
    while (auth.isLoading() && attempts < 20) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      attempts++;
    }
  }

  if (auth.isAuthenticated()) {
    return router.createUrlTree(['/']);
  }

  return true;
};
