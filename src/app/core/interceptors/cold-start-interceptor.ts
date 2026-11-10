import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize, timer } from 'rxjs';
import { SystemStatusService } from '../services';

export const coldStartInterceptor: HttpInterceptorFn = (req, next) => {
  const systemStatus = inject(SystemStatusService);

  let isDone = false;
  const coldStartTimer = timer(3500).subscribe(() => {
    if (!isDone) {
      systemStatus.setServerWakingUp(true);
    }
  });

  return next(req).pipe(
    finalize(() => {
      isDone = true;
      coldStartTimer.unsubscribe();
      systemStatus.setServerWakingUp(false);
    })
  );
};
