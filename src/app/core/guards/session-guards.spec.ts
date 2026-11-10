import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Data,
  GuardResult,
  Router,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { firstValueFrom, isObservable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { authInterceptor } from '../interceptors/auth-interceptor';
import { MemoryStorage, student, testToken } from '../testing/session-fixtures';
import { authGuard } from './auth-guard';
import { roleGuard } from './role-guard';
import { guestGuard } from './guest-guard';

describe('session guards', () => {
  let requests: HttpTestingController;

  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage());
    vi.stubGlobal('sessionStorage', new MemoryStorage());
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    requests = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    requests.verify();
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });

  async function evaluate(guard: CanActivateFn, data: Data = {}): Promise<GuardResult> {
    const route = new ActivatedRouteSnapshot();
    route.data = data;
    const result = TestBed.runInInjectionContext(() =>
      guard(route, {
        url: '/private',
        root: route,
        toString: () => '/private',
      }),
    );
    return isObservable(result) ? firstValueFrom(result) : result;
  }

  function destination(result: GuardResult): string | undefined {
    return result instanceof UrlTree ? TestBed.inject(Router).serializeUrl(result) : undefined;
  }

  it('redirects unauthenticated access to login', async () => {
    const decision = evaluate(authGuard);
    requests.expectOne(`${environment.apiUrl}/auth/refresh`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(destination(await decision)).toBe('/login');
  });

  it('waits for the server to validate a restored session', async () => {
    sessionStorage.setItem('acadezer_access_token', testToken());
    const decision = evaluate(authGuard);
    requests.expectOne(`${environment.apiUrl}/auth/me`).flush(student);
    expect(await decision).toBe(true);
  });

  it('cancels protected navigation without logging out on a temporary server failure', async () => {
    sessionStorage.setItem('acadezer_access_token', testToken());
    const decision = evaluate(authGuard);
    requests
      .expectOne(`${environment.apiUrl}/auth/me`)
      .flush({}, { status: 503, statusText: 'Unavailable' });
    expect(await decision).toBe(false);
    expect(sessionStorage.getItem('acadezer_access_token')).not.toBeNull();
  });

  it('rejects an administrative route for a student validated by the server', async () => {
    sessionStorage.setItem('acadezer_access_token', testToken());
    const decision = evaluate(roleGuard, { role: 'ADMIN' });
    requests.expectOne(`${environment.apiUrl}/auth/me`).flush(student);
    expect(destination(await decision)).toBe('/');
  });

  it('allows an administrative route only for the validated admin role', async () => {
    sessionStorage.setItem('acadezer_access_token', testToken());
    const decision = evaluate(roleGuard, { roles: ['ADMIN'] });
    requests.expectOne(`${environment.apiUrl}/auth/me`).flush({ ...student, role: 'ADMIN' });
    expect(await decision).toBe(true);
  });

  it('fails closed on invalid role configuration', async () => {
    sessionStorage.setItem('acadezer_access_token', testToken());
    const decision = evaluate(roleGuard, { roles: ['ADMIN', 42] });
    requests.expectOne(`${environment.apiUrl}/auth/me`).flush({ ...student, role: 'ADMIN' });
    expect(destination(await decision)).toBe('/');
  });

  it('allows guests to open login and registration', async () => {
    const decision = evaluate(guestGuard);
    requests.expectOne(`${environment.apiUrl}/auth/refresh`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(await decision).toBe(true);
  });

  it('redirects authenticated users away from guest pages', async () => {
    sessionStorage.setItem('acadezer_access_token', testToken());
    const decision = evaluate(guestGuard);
    requests.expectOne(`${environment.apiUrl}/auth/me`).flush(student);
    expect(destination(await decision)).toBe('/');
  });
});
