import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleRedirectGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.currentUser();
  if (!user || !user.roles.length) {
    return router.parseUrl('/login');
  }

  const role = user.roles[0];

  // Redirect basierend auf Rolle
  switch (role) {
    case 'ROLE_ADMIN':
      return router.parseUrl('/admin');
    case 'ROLE_HOCHSCHUL_VERWALTER':
      return router.parseUrl('/admin/mandanten');
    case 'ROLE_LEHRENDER':
      return router.parseUrl('/dashboard');
    case 'ROLE_PRUEFUNGSAMT':
      return router.parseUrl('/students');
    case 'ROLE_STUDENT':
      return router.parseUrl('/dashboard');
    default:
      return router.parseUrl('/dashboard');
  }
};
