import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private readonly key = 'acadezer_access_token';
  private readonly logoutKey = 'acadezer_logout';
  private token: string | null = null;
  private blocked = false;

  constructor() {
    try {
      this.token = sessionStorage.getItem(this.key);
      this.blocked = sessionStorage.getItem(this.logoutKey) === '1';
    } catch {
      this.token = null;
    }
    for (const key of ['inmo_access_token', 'inmo_refresh_token', 'inmo_user_profile', 'acadezer_refresh_token']) {
      try {
        localStorage.removeItem(key);
      } catch {
        /* Storage may be disabled by the browser. */
      }
      try {
        sessionStorage.removeItem(key);
      } catch {
        /* Keep the in-memory session usable. */
      }
    }
  }

  getAccessToken(): string | null {
    return this.token;
  }

  restorationBlocked(): boolean {
    return this.blocked;
  }

  blockRestoration(): void {
    this.blocked = true;
    try { sessionStorage.setItem(this.logoutKey, '1'); } catch { /* Storage can be unavailable. */ }
  }

  allowRestoration(): void {
    this.blocked = false;
    try { sessionStorage.removeItem(this.logoutKey); } catch { /* Storage can be unavailable. */ }
  }

  saveAccessToken(token: string): void {
    this.token = token;
    try {
      sessionStorage.setItem(this.key, token);
    } catch {
      /* Fall back to memory until this page closes. */
    }
  }

  clear(): void {
    this.token = null;
    try {
      sessionStorage.removeItem(this.key);
    } catch {
      /* The in-memory token is already cleared. */
    }
  }
}
