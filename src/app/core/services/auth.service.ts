import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, defer, finalize, map, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { AuthRequest, AuthResponse, RegisterRequest, UserResponse, UserRole } from '../models';
import { TokenStorageService } from './token-storage.service';
import { accessTokenExpiresAt, isAuthResponse, isUserResponse } from './session-validation';
import { createRequestAction } from './request-action';

type SessionState =
  | { status: 'anonymous' | 'checking' | 'unavailable' }
  | { status: 'authenticated'; user: UserResponse };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly storage = inject(TokenStorageService);
  private readonly session = signal<SessionState>({ status: 'anonymous' });
  private readonly baseUrl = environment.apiUrl.replace(/\/$/, '');
  private restoration?: Observable<boolean>;
  private expiryTimer?: ReturnType<typeof setTimeout>;
  private revision = 0;

  readonly status = computed(() => this.session().status);
  readonly currentUser = computed(() => {
    const session = this.session();
    return session.status === 'authenticated' ? session.user : null;
  });
  readonly isAuthenticated = computed(() => this.status() === 'authenticated');
  readonly isAdmin = computed(() => this.currentUser()?.role === 'ADMIN');
  readonly loginAction = createRequestAction();
  readonly registerAction = createRequestAction();

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.revision++;
      clearTimeout(this.expiryTimer);
    });
  }

  login(credentials: AuthRequest): Observable<AuthResponse> {
    return this.loginAction.run(() =>
      defer(() => {
        const revision = ++this.revision;
        this.restoration = undefined;
        return this.http.post<unknown>(`${this.baseUrl}/auth`, credentials).pipe(
          map((response) => {
            if (!isAuthResponse(response) || !accessTokenExpiresAt(response.accessToken)) {
              throw new Error('La API devolvió una sesión inválida');
            }
            return response;
          }),
          tap((response) => {
            if (revision !== this.revision) return;
            this.storage.saveAccessToken(response.accessToken);
            this.acceptUser(response.usuario, response.accessToken);
          }),
        );
      }),
    );
  }

  register(data: RegisterRequest): Observable<UserResponse> {
    return this.registerAction.run(() =>
      this.http.post<unknown>(`${this.baseUrl}/auth/register`, data).pipe(
        map((response) => {
          if (!isUserResponse(response)) throw new Error('La API devolvió un usuario inválido');
          return response;
        }),
      ),
    );
  }

  restoreSession(): Observable<boolean> {
    const token = this.storage.getAccessToken();
    if (!token || !accessTokenExpiresAt(token)) {
      this.clearSession();
      return of(false);
    }
    if (this.isAuthenticated()) return of(true);
    if (this.restoration) return this.restoration;
    const revision = this.revision;
    this.session.set({ status: 'checking' });
    const request = this.http.get<unknown>(`${this.baseUrl}/auth/me`).pipe(
      map((user) => {
        if (revision !== this.revision || token !== this.storage.getAccessToken()) return false;
        if (!isUserResponse(user) || !user.enabled || !accessTokenExpiresAt(token)) {
          this.clearSession();
          return false;
        }
        this.acceptUser(user, token);
        return true;
      }),
      catchError((error: unknown) => {
        if (revision === this.revision && token === this.storage.getAccessToken()) {
          if (
            error instanceof HttpErrorResponse &&
            (error.status === 401 || error.status === 403)
          ) {
            this.clearSession();
          } else {
            this.session.set({ status: 'unavailable' });
          }
        }
        return of(false);
      }),
      finalize(() => {
        if (this.restoration === request) this.restoration = undefined;
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.restoration = request;
    return request;
  }

  hasRole(role: UserRole): boolean {
    return this.currentUser()?.role === role;
  }

  logout(): void {
    this.clearSession();
    void this.router.navigate(['/login']);
  }

  expireSession(token: string): void {
    if (this.storage.getAccessToken() === token) this.logout();
  }

  private clearSession(): void {
    this.revision++;
    clearTimeout(this.expiryTimer);
    this.restoration = undefined;
    this.storage.clear();
    this.session.set({ status: 'anonymous' });
  }

  private acceptUser(user: UserResponse, token: string): void {
    this.session.set({ status: 'authenticated', user });
    const scheduleExpiry = (): void => {
      clearTimeout(this.expiryTimer);
      const expiresAt = accessTokenExpiresAt(token);
      if (!expiresAt) {
        this.expireSession(token);
        return;
      }
      this.expiryTimer = setTimeout(
        scheduleExpiry,
        Math.min(expiresAt - Date.now(), 2_147_483_647),
      );
    };
    scheduleExpiry();
  }
}
