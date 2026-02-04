import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard für Admin-Bereiche. Erlaubt nur ADMIN.
 * HOCHSCHUL_VERWALTER wird zu /admin/mandanten weitergeleitet.
 */
export const adminGuard: CanActivateFn = (): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }
  if (auth.hasRole('HOCHSCHUL_VERWALTER')) {
    return router.createUrlTree(['/admin/mandanten']);
  }
  if (!auth.hasRole('ADMIN')) {
    return router.createUrlTree(['/dashboard']);
  }
  return true;
};
