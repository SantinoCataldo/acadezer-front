import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { createRequestAction } from '../../../../core/services/request-action';
import type { EvaluacionResponse } from '../../models';
import { EvaluacionService } from '../../evaluacion.service';
import { Modal } from '../../../subjects/components/modal/modal';
import { dangerButton, errorSurface, secondaryButton } from '../../../subjects/dialog-styles';

@Component({
  selector: 'app-delete-evaluacion-dialog',
  imports: [Modal],
  templateUrl: './delete-evaluacion-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteEvaluacionDialog {
  readonly evaluacion = input.required<EvaluacionResponse>();
  readonly deleted = output<EvaluacionResponse>();
  readonly cancelled = output<void>();

  private readonly evaluaciones = inject(EvaluacionService);
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
      .run(() => this.evaluaciones.delete(this.evaluacion().id))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.deleted.emit(this.evaluacion()),
        error: () => undefined,
      });
  }
}
