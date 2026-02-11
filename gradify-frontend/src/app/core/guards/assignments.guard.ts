import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard für Dozenten-Modul-Zuweisungen.
 * Erlaubt ADMIN, HOCHSCHUL_VERWALTER und PRUEFUNGSAMT.
 */
export const assignmentsGuard: CanActivateFn = (): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }
  if (auth.hasRole('ADMIN') || auth.hasRole('HOCHSCHUL_VERWALTER') || auth.hasRole('PRUEFUNGSAMT')) {
    return true;
  }
  return router.createUrlTree(['/dashboard']);
};
