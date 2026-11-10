import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { isUserRole } from '../services/session-validation';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.restoreSession().pipe(
    map((authenticated) => {
      if (!authenticated)
        return auth.status() === 'unavailable' ? false : router.createUrlTree(['/login']);
      const role: unknown = route.data['role'];
      const roles: unknown = route.data['roles'];
      const allowed = isUserRole(role)
        ? auth.hasRole(role)
        : Array.isArray(roles) &&
          roles.length > 0 &&
          roles.every(isUserRole) &&
          roles.some((value) => auth.hasRole(value));
      return allowed ? true : router.createUrlTree(['/']);
    }),
  );
};
