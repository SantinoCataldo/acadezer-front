import { DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { EMPTY, Observable, catchError, defer, finalize, throwError } from 'rxjs';

function retryDelay(error: HttpErrorResponse): number {
  const header = error.headers.get('Retry-After')?.trim() ?? '';
  if (!/^\d+$/.test(header)) return 1;
  const seconds = Number(header);
  return seconds > 0 &&
    Number.isSafeInteger(seconds) &&
    Number.isSafeInteger(Date.now() + seconds * 1000)
    ? seconds
    : 1;
}

function responseMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const body: unknown = error.error;
    if (
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      typeof body.message === 'string' &&
      body.message.trim()
    )
      return body.message;
  }
  return 'No se pudo completar la solicitud. Intentá nuevamente.';
}

export function createRequestAction() {
  const destroyRef = inject(DestroyRef);
  const pending = signal(false);
  const remainingSeconds = signal(0);
  const errorMessage = signal<string | null>(null);
  let deadline = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let destroyed = false;

  const updateCountdown = (): void => {
    remainingSeconds.set(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    if (remainingSeconds() > 0) timer = setTimeout(updateCountdown, 1000);
  };

  destroyRef.onDestroy(() => {
    destroyed = true;
    clearTimeout(timer);
  });

  return {
    pending: pending.asReadonly(),
    remainingSeconds: remainingSeconds.asReadonly(),
    errorMessage: errorMessage.asReadonly(),
    disabled: computed(() => pending() || remainingSeconds() > 0),
    run<T>(send: () => Observable<T>): Observable<T> {
      return defer(() => {
        if (destroyed || pending()) return EMPTY;
        if (remainingSeconds() > 0 && Date.now() < deadline) return EMPTY;
        clearTimeout(timer);
        remainingSeconds.set(0);
        pending.set(true);
        errorMessage.set(null);
        return defer(send).pipe(
          takeUntilDestroyed(destroyRef),
          catchError((error: unknown) => {
            errorMessage.set(responseMessage(error));
            if (error instanceof HttpErrorResponse && error.status === 429) {
              deadline = Date.now() + retryDelay(error) * 1000;
              updateCountdown();
            }
            return throwError(() => error);
          }),
          finalize(() => pending.set(false)),
        );
      });
    },
  };
}
