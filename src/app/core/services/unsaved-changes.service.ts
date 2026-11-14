import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UnsavedChangesService {
  readonly hasPendingChanges = signal(false);
  readonly confirmRequested = signal(false);
  private resolver: ((value: boolean) => void) | null = null;

  askConfirmation(): Promise<boolean> {
    this.confirmRequested.set(true);
    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }

  resolveConfirmation(allowed: boolean): void {
    this.confirmRequested.set(false);
    if (this.resolver) {
      this.resolver(allowed);
      this.resolver = null;
    }
  }
}

