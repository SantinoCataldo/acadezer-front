import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth-interceptor';
import { environment } from '../../../environments/environment';
import { MemoryStorage, student, testToken } from '../testing/session-fixtures';

describe('authentication security', () => {
  let http: HttpClient;
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
    http = TestBed.inject(HttpClient);
    requests = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    requests.verify();
    TestBed.resetTestingModule();
    localStorage.clear();
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it('never forwards a stored token to another origin', () => {
    localStorage.setItem('inmo_access_token', 'legacy-secret');
    sessionStorage.setItem('acadezer_access_token', 'academic-secret');
    http.get('https://untrusted.example/api/materias').subscribe();
    const request = requests.expectOne('https://untrusted.example/api/materias');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush([]);
  });

  it('never authenticates from a locally forged user profile', () => {
    localStorage.setItem(
      'inmo_user_profile',
      JSON.stringify({ role: 'ROLE_ADMIN', nombre: 'Forged' }),
    );
    expect(TestBed.inject(AuthService).isAuthenticated()).toBe(false);
  });

  it('does not initiate refresh or redirect on a public login failure', () => {
    http.post(`${environment.apiUrl}/auth`, {}).subscribe({ error: () => undefined });
    requests
      .expectOne(`${environment.apiUrl}/auth`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    requests.expectNone(`${environment.apiUrl}/auth/refresh`);
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
  });

  it.each(['/auth', '/auth/register', '/health', '/api-not-protected'])(
    'does not send a token to the public path %s',
    (path) => {
      sessionStorage.setItem('acadezer_access_token', testToken());
      http.get(`${environment.apiUrl}${path}`).subscribe();
      const request = requests.expectOne(`${environment.apiUrl}${path}`);
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush({});
    },
  );

  it('does not match a host that starts with the API hostname', () => {
    sessionStorage.setItem('acadezer_access_token', testToken());
    const url = `${environment.apiUrl}.untrusted.example/api/materias`;
    http.get(url).subscribe();
    const request = requests.expectOne(url);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('does not log out a valid session on a forbidden response', () => {
    const auth = TestBed.inject(AuthService);
    auth.login({ email: student.email, password: 'secret-password' }).subscribe();
    requests.expectOne(`${environment.apiUrl}/auth`).flush({
      accessToken: testToken(),
      tokenType: 'Bearer',
      expiresIn: 60,
      usuario: student,
    });
    http.get(`${environment.apiUrl}/api/admin/users`).subscribe({ error: () => undefined });
    requests
      .expectOne(`${environment.apiUrl}/api/admin/users`)
      .flush({}, { status: 403, statusText: 'Forbidden' });
    expect(auth.isAuthenticated()).toBe(true);
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
  });
});
