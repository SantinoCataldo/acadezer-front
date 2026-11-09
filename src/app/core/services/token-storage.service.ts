import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private readonly key = 'acadezer_access_token';
  private token: string | null = null;

  constructor() {
    try {
      this.token = sessionStorage.getItem(this.key);
    } catch {
      this.token = null;
    }
    for (const key of ['inmo_access_token', 'inmo_refresh_token', 'inmo_user_profile']) {
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
