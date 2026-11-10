import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SystemStatusService {
  readonly isServerWakingUp = signal(false);

  setServerWakingUp(waking: boolean): void {
    this.isServerWakingUp.set(waking);
  }
}
