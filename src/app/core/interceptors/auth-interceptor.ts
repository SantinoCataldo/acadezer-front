import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { TokenStorageService } from '../services/token-storage.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const document = inject(DOCUMENT);
  const api = new URL(environment.apiUrl, document.baseURI);
  const url = new URL(request.url, document.baseURI);
  const prefix = api.pathname.replace(/\/$/, '');
  const protectedRoute =
    url.origin === api.origin &&
    (url.pathname === `${prefix}/auth/me` ||
      url.pathname === `${prefix}/api` ||
      url.pathname.startsWith(`${prefix}/api/`));
  if (!protectedRoute) return next(request);
  const storage = inject(TokenStorageService);
  const auth = inject(AuthService);
  const token = storage.getAccessToken();
  const outgoing = token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;
  return next(outgoing).pipe(
    catchError((error: unknown) => {
      if (token && error instanceof HttpErrorResponse && error.status === 401)
        auth.expireSession(token);
      return throwError(() => error);
    }),
  );
};
