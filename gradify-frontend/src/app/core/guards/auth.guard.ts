import { inject } from '@angular/core';
import {
  CanActivateChildFn,
  CanActivateFn,
  CanMatchFn,
  Router,
  UrlTree
} from '@angular/router';
import { AuthService } from '../services/auth.service';

const checkAuth = (): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.isAuthenticated() ? true : router.createUrlTree(['/login']);
};

export const authGuard: CanActivateFn = () => checkAuth();

export const authGuardChild: CanActivateChildFn = () => checkAuth();

export const authGuardMatch: CanMatchFn = () => checkAuth();
