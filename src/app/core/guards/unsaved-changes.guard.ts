import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { UnsavedChangesService } from '../services/unsaved-changes.service';

export const canDeactivateUnsavedChangesGuard: CanDeactivateFn<unknown> = () => {
  const unsaved = inject(UnsavedChangesService);
  if (!unsaved.hasPendingChanges()) {
    return true;
  }
  return unsaved.askConfirmation();
};

