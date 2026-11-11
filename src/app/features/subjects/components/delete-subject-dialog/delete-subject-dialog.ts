import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { createRequestAction } from '../../../../core/services/request-action';
import type { SubjectResponse } from '../../models';
import { SubjectsService } from '../../services/subjects.service';
import { Modal } from '../modal/modal';
import { dangerButton, errorSurface, secondaryButton } from '../../dialog-styles';

/**
 * Confirmación de borrado de materia.
 *
 * MAT-02: la advertencia explica que el backend borra en cascada apuntes,
 * pendientes, evaluaciones y asistencias. Si el borrado falla, el diálogo
 * sigue abierto con el error y la materia permanece en el listado.
 */
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

  readonly action = createRequestAction();
  readonly cascadeWarning =
    'Al eliminar esta materia también se borran sus apuntes, pendientes, evaluaciones y asistencias asociados. Esta acción no se puede deshacer.';

  // Referencias para la plantilla.
  readonly dangerButtonClass = dangerButton;
  readonly secondaryButtonClass = secondaryButton;
  readonly errorSurfaceClass = errorSurface;

  confirm(): void {
    if (this.action.disabled()) return;

    this.action
      .run(() => this.subjects.delete(this.subject().id))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.deleted.emit(),
        error: () => undefined,
      });
  }
}
