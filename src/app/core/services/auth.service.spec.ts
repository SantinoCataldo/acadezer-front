import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { authInterceptor } from '../interceptors/auth-interceptor';
import { MemoryStorage, student, testToken } from '../testing/session-fixtures';
import { AuthService } from './auth.service';
import { TokenStorageService } from './token-storage.service';

describe('Acadezer session', () => {
  let requests: HttpTestingController;

  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage());
    vi.stubGlobal('sessionStorage', new MemoryStorage());
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate: vi.fn().mockResolvedValue(true) } },
      ],
    });
    requests = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    requests.verify();
    TestBed.resetTestingModule();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function startLogin(token = testToken()): AuthService {
    const auth = TestBed.inject(AuthService);
    auth.login({ email: student.email, password: 'secret-password' }).subscribe();
    const login = requests.expectOne(`${environment.apiUrl}/auth`);
    expect(login.request.headers.has('Authorization')).toBe(false);
    login.flush({ accessToken: token, tokenType: 'Bearer', expiresIn: 60, usuario: student });
    return auth;
  }

  it('accepts the server user and stores only the access token in session storage', () => {
    const token = testToken();
    const auth = startLogin(token);
    expect(auth.currentUser()).toEqual(student);
    expect(auth.isAuthenticated()).toBe(true);
    expect(sessionStorage.getItem('acadezer_access_token')).toBe(token);
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(1);
  });

  it('validates a restored token with /auth/me and shares the pending request', () => {
    const token = testToken();
    sessionStorage.setItem('acadezer_access_token', token);
    const auth = TestBed.inject(AuthService);
    const results: boolean[] = [];
    expect(auth.isAuthenticated()).toBe(false);
    auth.restoreSession().subscribe((value) => results.push(value));
    auth.restoreSession().subscribe((value) => results.push(value));
    expect(auth.status()).toBe('checking');
    const me = requests.expectOne(`${environment.apiUrl}/auth/me`);
    expect(me.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    me.flush(student);
    expect(results).toEqual([true, true]);
    expect(auth.isAuthenticated()).toBe(true);
  });

  it.each(['malformed-token', testToken(Date.now() - 60_000)])(
    'rejects an invalid or expired token without a network request: %s',
    (token) => {
      sessionStorage.setItem('acadezer_access_token', token);
      const auth = TestBed.inject(AuthService);
      auth.restoreSession().subscribe((value) => expect(value).toBe(false));
      requests.expectNone(`${environment.apiUrl}/auth/me`);
      expect(TestBed.inject(TokenStorageService).getAccessToken()).toBeNull();
    },
  );

  it('preserves the token and allows retry after a transient restoration failure', () => {
    const token = testToken();
    sessionStorage.setItem('acadezer_access_token', token);
    const auth = TestBed.inject(AuthService);
    auth.restoreSession().subscribe();
    requests
      .expectOne(`${environment.apiUrl}/auth/me`)
      .flush({}, { status: 503, statusText: 'Unavailable' });
    expect(auth.status()).toBe('unavailable');
    expect(TestBed.inject(TokenStorageService).getAccessToken()).toBe(token);
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
    auth.restoreSession().subscribe();
    requests.expectOne(`${environment.apiUrl}/auth/me`).flush(student);
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('clears a session rejected by the server without starting refresh', () => {
    sessionStorage.setItem('acadezer_access_token', testToken());
    const auth = TestBed.inject(AuthService);
    auth.restoreSession().subscribe((value) => expect(value).toBe(false));
    requests
      .expectOne(`${environment.apiUrl}/auth/me`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.isAuthenticated()).toBe(false);
    expect(TestBed.inject(TokenStorageService).getAccessToken()).toBeNull();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledTimes(1);
    requests.expectNone(`${environment.apiUrl}/auth/refresh`);
  });

  it.each([
    { ...student, enabled: false },
    { ...student, role: 'ROLE_ADMIN' },
    { nombre: 'Forged' },
  ])('rejects an invalid or disabled restored user: %j', (user) => {
    sessionStorage.setItem('acadezer_access_token', testToken());
    const auth = TestBed.inject(AuthService);
    auth.restoreSession().subscribe((value) => expect(value).toBe(false));
    requests.expectOne(`${environment.apiUrl}/auth/me`).flush(user);
    expect(auth.isAuthenticated()).toBe(false);
    expect(TestBed.inject(TokenStorageService).getAccessToken()).toBeNull();
  });

  it('cannot restore an in-flight session after logout', () => {
    sessionStorage.setItem('acadezer_access_token', testToken());
    const auth = TestBed.inject(AuthService);
    auth.restoreSession().subscribe((value) => expect(value).toBe(false));
    const me = requests.expectOne(`${environment.apiUrl}/auth/me`);
    auth.logout();
    me.flush(student);
    expect(auth.currentUser()).toBeNull();
  });

  it('cannot accept an in-flight login after logout', () => {
    const auth = TestBed.inject(AuthService);
    auth.login({ email: student.email, password: 'secret-password' }).subscribe();
    const login = requests.expectOne(`${environment.apiUrl}/auth`);
    auth.logout();
    login.flush({ accessToken: testToken(), tokenType: 'Bearer', expiresIn: 60, usuario: student });
    expect(auth.isAuthenticated()).toBe(false);
    expect(TestBed.inject(TokenStorageService).getAccessToken()).toBeNull();
  });

  it('does not invalidate a newer login when an older request returns 401', () => {
    startLogin(testToken(Date.now() + 60_000));
    TestBed.inject(HttpClient)
      .get(`${environment.apiUrl}/api/materias`)
      .subscribe({ error: () => undefined });
    const oldRequest = requests.expectOne(`${environment.apiUrl}/api/materias`);
    const newToken = testToken(Date.now() + 120_000);
    const auth = startLogin(newToken);
    oldRequest.flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.isAuthenticated()).toBe(true);
    expect(TestBed.inject(TokenStorageService).getAccessToken()).toBe(newToken);
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
  });

  it('redirects only once when concurrent protected requests reject the same token', () => {
    const auth = startLogin();
    const http = TestBed.inject(HttpClient);
    http.get(`${environment.apiUrl}/api/materias`).subscribe({ error: () => undefined });
    http.get(`${environment.apiUrl}/api/pendientes/proximos`).subscribe({ error: () => undefined });
    for (const request of requests.match((req) =>
      req.url.startsWith(`${environment.apiUrl}/api/`),
    )) {
      request.flush({}, { status: 401, statusText: 'Unauthorized' });
    }
    expect(auth.isAuthenticated()).toBe(false);
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledTimes(1);
  });

  it('expires an idle session at the token deadline', () => {
    vi.useFakeTimers();
    const auth = startLogin(testToken(Date.now() + 2000));
    vi.advanceTimersByTime(2100);
    expect(auth.isAuthenticated()).toBe(false);
    expect(TestBed.inject(TokenStorageService).getAccessToken()).toBeNull();
  });

  it('registers a student without silently logging in', () => {
    const auth = TestBed.inject(AuthService);
    auth
      .register({ nombre: student.nombre, email: student.email, password: 'secret-password' })
      .subscribe();
    requests
      .expectOne(`${environment.apiUrl}/auth/register`)
      .flush(student, { status: 201, statusText: 'Created' });
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('removes only legacy session keys and preserves unrelated preferences', () => {
    localStorage.setItem('inmo_access_token', 'old-token');
    localStorage.setItem('inmo_refresh_token', 'old-refresh');
    localStorage.setItem('inmo_user_profile', '{"role":"ROLE_ADMIN"}');
    localStorage.setItem('theme', 'dark');
    TestBed.inject(TokenStorageService);
    expect(localStorage.length).toBe(1);
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('blocks duplicate login and exposes its 429 cooldown without touching an existing session', () => {
    vi.useFakeTimers();
    const token = testToken();
    const auth = startLogin(token);
    const credentials = { email: student.email, password: 'password' };
    auth.login(credentials).subscribe({ error: () => undefined });
    auth.login(credentials).subscribe();
    requests.expectOne(`${environment.apiUrl}/auth`).flush(
      { message: 'Esperá antes de ingresar' },
      {
        status: 429,
        statusText: 'Too Many Requests',
        headers: { 'Retry-After': '2' },
      },
    );
    expect(auth.loginAction.errorMessage()).toBe('Esperá antes de ingresar');
    expect(auth.loginAction.disabled()).toBe(true);
    expect(auth.isAuthenticated()).toBe(true);
    expect(TestBed.inject(TokenStorageService).getAccessToken()).toBe(token);
    vi.advanceTimersByTime(2000);
    expect(auth.loginAction.disabled()).toBe(false);
    requests.expectNone(`${environment.apiUrl}/auth`);
  });

  it('blocks duplicate registration and keeps its cooldown separate from login', () => {
    vi.useFakeTimers();
    const auth = TestBed.inject(AuthService);
    const data = { nombre: student.nombre, email: student.email, password: 'password' };
    auth.register(data).subscribe({ error: () => undefined });
    auth.register(data).subscribe();
    requests.expectOne(`${environment.apiUrl}/auth/register`).flush(
      { message: 'Registro limitado' },
      {
        status: 429,
        statusText: 'Too Many Requests',
        headers: { 'Retry-After': '2' },
      },
    );
    expect(auth.registerAction.errorMessage()).toBe('Registro limitado');
    expect(auth.registerAction.disabled()).toBe(true);
    expect(auth.loginAction.disabled()).toBe(false);
    auth.register(data).subscribe();
    requests.expectNone(`${environment.apiUrl}/auth/register`);
    vi.advanceTimersByTime(2000);
    expect(auth.registerAction.disabled()).toBe(false);
    requests.expectNone(`${environment.apiUrl}/auth/register`);
  });
});
