import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard für Studienverlaufsplan. Erlaubt nur ADMIN und STUDENT.
 * HOCHSCHUL_VERWALTER und andere Rollen werden zu /dashboard weitergeleitet.
 */
export const studyPlanGuard: CanActivateFn = (): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }
  if (auth.hasRole('ADMIN') || auth.hasRole('STUDENT')) {
    return true;
  }
  return router.createUrlTree(['/dashboard']);
};
