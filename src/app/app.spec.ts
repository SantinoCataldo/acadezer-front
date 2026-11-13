import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { AuthService } from '@core/services/auth.service';
import type { UserResponse } from '@core/models/user.models';
import { App } from './app';
import { routes } from './app.routes';

vi.mock('@material/material-color-utilities', () => {
  class SchemeStub {
    readonly colors = { allColors: [] };

    getArgb(): number {
      return 0;
    }
  }

  return {
    Hct: { fromInt: () => ({}) },
    SchemeMonochrome: SchemeStub,
    SchemeTonalSpot: SchemeStub,
    argbFromHex: () => 0,
    hexFromArgb: () => '#000000',
  };
});

describe('App', () => {
  beforeEach(async () => {
    vi.stubGlobal('matchMedia', (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
    }));

    const user: UserResponse = {
      id: 1,
      nombre: 'Santino',
      email: 'santino@example.com',
      role: 'STUDENT',
      enabled: true,
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        {
          provide: AuthService,
          useValue: {
            restoreSession: () => of(true),
            currentUser: signal<UserResponse | null>(user),
            logout: vi.fn(),
          },
        },
      ],
    }).compileComponents();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('renders the home page through the configured lazy route', async () => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/');
    await fixture.whenStable();
    const root: unknown = fixture.nativeElement;
    if (!(root instanceof HTMLElement)) throw new Error('Missing application root');
    expect(root.querySelector('h1')?.textContent).toContain('Vos estudiá');
  });
});
