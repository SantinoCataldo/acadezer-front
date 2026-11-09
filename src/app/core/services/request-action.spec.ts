import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { authInterceptor } from '../interceptors/auth-interceptor';
import { MemoryStorage, student, testToken } from '../testing/session-fixtures';
import { AuthService } from './auth.service';
import { TokenStorageService } from './token-storage.service';
import { createRequestAction } from './request-action';

describe('rate-limited request action', () => {
  let http: HttpClient;
  let requests: HttpTestingController;
  const message = 'Se alcanzó el límite de solicitudes. Intentá nuevamente más tarde';
  const url = `${environment.apiUrl}/api/apuntes/1/preguntas`;

  beforeEach(() => {
    vi.useFakeTimers();
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
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function createAction() {
    return TestBed.runInInjectionContext(createRequestAction);
  }

  function reject(header?: string): void {
    requests.expectOne(url).flush(
      { status: 429, message },
      {
        status: 429,
        statusText: 'Too Many Requests',
        headers: header === undefined ? {} : { 'Retry-After': header },
      },
    );
  }

  it('blocks a duplicate subscription while the first request is pending', () => {
    const action = createAction();
    action.run(() => http.post(url, {})).subscribe();
    action.run(() => http.post(url, {})).subscribe();
    expect(action.pending()).toBe(true);
    expect(action.disabled()).toBe(true);
    requests.expectOne(url).flush({ preguntas: [] });
    expect(action.disabled()).toBe(false);
  });

  it('exposes the backend message, counts down, and waits for an explicit retry', () => {
    const action = createAction();
    action.run(() => http.post(url, {})).subscribe({ error: () => undefined });
    reject('3');
    expect(action.errorMessage()).toBe(message);
    expect(action.pending()).toBe(false);
    expect(action.remainingSeconds()).toBe(3);
    action.run(() => http.post(url, {})).subscribe();
    requests.expectNone(url);
    vi.advanceTimersByTime(1000);
    expect(action.remainingSeconds()).toBe(2);
    vi.advanceTimersByTime(2000);
    expect(action.disabled()).toBe(false);
    requests.expectNone(url);
    action.run(() => http.post(url, {})).subscribe();
    expect(action.errorMessage()).toBeNull();
    requests.expectOne(url).flush({ preguntas: [] });
  });

  it.each([
    undefined,
    '',
    '0',
    '-1',
    '1.5',
    'NaN',
    'Infinity',
    '1e3',
    'Mon, 09 Nov 2026 16:00:00 GMT',
    '99999999999999999999',
  ])('falls back to one second for missing or invalid Retry-After: %s', (header) => {
    const action = createAction();
    action.run(() => http.post(url, {})).subscribe({ error: () => undefined });
    reject(header);
    expect(action.remainingSeconds()).toBe(1);
    vi.advanceTimersByTime(1000);
    expect(action.disabled()).toBe(false);
    requests.expectNone(url);
  });

  it('accepts another 429 after a concurrency wait without retrying in the background', () => {
    const action = createAction();
    for (let attempt = 0; attempt < 2; attempt++) {
      action.run(() => http.post(url, {})).subscribe({ error: () => undefined });
      reject('1');
      expect(action.disabled()).toBe(true);
      vi.advanceTimersByTime(1000);
      requests.expectNone(url);
    }
  });

  it('never logs out or clears JWT on a protected 429', () => {
    const auth = TestBed.inject(AuthService);
    const token = testToken();
    auth.login({ email: student.email, password: 'password' }).subscribe();
    requests
      .expectOne(`${environment.apiUrl}/auth`)
      .flush({ accessToken: token, tokenType: 'Bearer', expiresIn: 60, usuario: student });
    const action = createAction();
    action.run(() => http.post(url, {})).subscribe({ error: () => undefined });
    reject('10');
    expect(auth.isAuthenticated()).toBe(true);
    expect(TestBed.inject(TokenStorageService).getAccessToken()).toBe(token);
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
  });

  it('does not assign a cooldown to a 404', () => {
    const action = createAction();
    action.run(() => http.post(url, {})).subscribe({ error: () => undefined });
    requests
      .expectOne(url)
      .flush({ message: 'Recurso no encontrado' }, { status: 404, statusText: 'Not Found' });
    expect(action.errorMessage()).toBe('Recurso no encontrado');
    expect(action.disabled()).toBe(false);
    expect(action.remainingSeconds()).toBe(0);
  });

  it('finishes pending state when a request is cancelled', () => {
    const action = createAction();
    const subscription = action.run(() => http.post(url, {})).subscribe();
    const request = requests.expectOne(url);
    subscription.unsubscribe();
    expect(request.cancelled).toBe(true);
    expect(action.pending()).toBe(false);
  });

  it('cancels an active request when its owner is destroyed', () => {
    const action = createAction();
    action.run(() => http.post(url, {})).subscribe();
    const request = requests.expectOne(url);
    TestBed.resetTestingModule();
    expect(request.cancelled).toBe(true);
    expect(action.pending()).toBe(false);
  });

  it('clears its countdown timer on destruction and ignores later subscriptions', () => {
    const action = createAction();
    action.run(() => http.post(url, {})).subscribe({ error: () => undefined });
    reject('60');
    TestBed.resetTestingModule();
    expect(vi.getTimerCount()).toBe(0);
    const send = vi.fn(() => http.post(url, {}));
    action.run(send).subscribe();
    expect(send).not.toHaveBeenCalled();
  });
});
