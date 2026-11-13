import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.restoreSession().pipe(
    map((authenticated) => {
      if (!authenticated) return true;
      const target = auth.hasRole('ADMIN') ? '/admin' : '/estudio';
      return router.createUrlTree([target]);
    }),
  );
};
