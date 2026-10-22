import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ClerkService } from './clerk.service';

export const authGuard: CanActivateFn = async () => {
  const clerk = inject(ClerkService);
  const router = inject(Router);

  await clerk.initialize();

  // If still loading, wait a brief moment to avoid flicker
  if (clerk.isLoading()) {
    let attempts = 0;
    while (clerk.isLoading() && attempts < 25) {
      await new Promise((resolve) => setTimeout(resolve, 40));
      attempts++;
    }
  }

  if (clerk.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/auth']);
};

export const guestGuard: CanActivateFn = async () => {
  const clerk = inject(ClerkService);
  const router = inject(Router);

  await clerk.initialize();

  if (clerk.isLoading()) {
    let attempts = 0;
    while (clerk.isLoading() && attempts < 25) {
      await new Promise((resolve) => setTimeout(resolve, 40));
      attempts++;
    }
  }

  if (clerk.isAuthenticated()) {
    return router.createUrlTree(['/']);
  }

  return true;
};
