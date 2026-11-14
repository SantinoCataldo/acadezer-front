import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { createRequestAction } from '../../../../core/services/request-action';
import type { SubjectResponse } from '../../models';
import { SubjectsService } from '../../services/subjects.service';
import { Modal } from '../modal/modal';
import { dangerButton, errorSurface, secondaryButton } from '../../dialog-styles';
import { toast } from 'ngx-sonner';

@Component({
  selector: 'app-delete-subject-dialog',
  imports: [Modal],
  templateUrl: './delete-subject-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteSubjectDialog {
  readonly subject = input.required<SubjectResponse>();
  readonly deleted = output<void>();
  readonly cancelled = output<void>();

  private readonly subjects = inject(SubjectsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly modal = viewChild.required(Modal);

  readonly action = createRequestAction();

  readonly dangerButtonClass = dangerButton;
  readonly secondaryButtonClass = secondaryButton;
  readonly errorSurfaceClass = errorSurface;

  close(): void {
    this.modal().requestClose();
  }

  confirm(): void {
    if (this.action.disabled()) return;

    this.action
      .run(() => this.subjects.delete(this.subject().id))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          toast.success('Materia eliminada');
          this.deleted.emit();
        },
        error: () => undefined,
      });
  }
}
