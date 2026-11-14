import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.restoreSession().pipe(
    map((authenticated) => {
      if (!authenticated) {
        return auth.status() === 'unavailable' ? false : router.createUrlTree(['/login']);
      }
      if (auth.hasRole('ADMIN')) {
        return router.createUrlTree(['/admin']);
      }
      return true;
    }),
  );
};
