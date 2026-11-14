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
    try {
      this.clearLegacySessionKeys(localStorage);
    } catch {
    }
    try {
      this.clearLegacySessionKeys(sessionStorage);
    } catch {
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
    try { sessionStorage.setItem(this.logoutKey, '1'); } catch {}
  }

  allowRestoration(): void {
    this.blocked = false;
    try { sessionStorage.removeItem(this.logoutKey); } catch {}
  }

  saveAccessToken(token: string): void {
    this.token = token;
    try {
      sessionStorage.setItem(this.key, token);
    } catch {
    }
  }

  clear(): void {
    this.token = null;
    try {
      sessionStorage.removeItem(this.key);
    } catch {
    }
  }

  private clearLegacySessionKeys(storage: Storage): void {
    for (let index = storage.length - 1; index >= 0; index -= 1) {
      const key = storage.key(index);
      if (
        key &&
        (key.startsWith('inmo_') ||
          (key.startsWith('acadezer_') && key.endsWith('_refresh_token')))
      ) {
        storage.removeItem(key);
      }
    }
  }
}
