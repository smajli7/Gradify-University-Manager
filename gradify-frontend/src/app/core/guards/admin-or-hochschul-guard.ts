import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard für Admin- und Hochschul-Verwalter-Bereiche.
 * Erlaubt ADMIN und HOCHSCHUL_VERWALTER.
 */
export const adminOrHochschulGuard: CanActivateFn = (): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }
  if (auth.hasRole('ADMIN') || auth.hasRole('HOCHSCHUL_VERWALTER')) {
    return true;
  }
  return router.createUrlTree(['/dashboard']);
};
