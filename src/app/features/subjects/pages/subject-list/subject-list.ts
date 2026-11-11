import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import type { SubjectResponse } from '../../models';
import { SubjectsService } from '../../services/subjects.service';
import { DeleteSubjectDialog } from '../../components/delete-subject-dialog/delete-subject-dialog';
import { SubjectFormDialog } from '../../components/subject-form-dialog/subject-form-dialog';
import { iconButton, primaryButton } from '../../dialog-styles';

type ListState = 'loading' | 'error' | 'ready';

/**
 * Listado de materias del usuario autenticado.
 *
 * MAT-03: lista las materias propias, ofrece crear la primera cuando no hay
 * ninguna y usa los estados de carga y error con recuperación (RNF-04).
 * Los diálogos de crear/editar y eliminar se reutilizan desde el detalle.
 */
@Component({
  selector: 'app-subject-list',
  imports: [RouterLink, SubjectFormDialog, DeleteSubjectDialog],
  templateUrl: './subject-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubjectList {
  private readonly subjectsService = inject(SubjectsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly subjects = signal<readonly SubjectResponse[]>([]);
  readonly state = signal<ListState>('loading');

  /** null = cerrado; 'new' o una materia concreta = diálogo de formulario. */
  readonly formTarget = signal<SubjectResponse | 'new' | null>(null);
  readonly deleteTarget = signal<SubjectResponse | null>(null);

  readonly isEmpty = computed(() => this.state() === 'ready' && this.subjects().length === 0);

  // Referencias para la plantilla.
  readonly primaryButtonClass = primaryButton;
  readonly iconButtonClass = iconButton;

  constructor() {
    this.load();
  }

  load(): void {
    this.state.set('loading');
    this.subjectsService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.subjects.set(list);
          this.state.set('ready');
        },
        error: () => {
          this.subjects.set([]);
          this.state.set('error');
        },
      });
  }

  openCreateDialog(): void {
    this.formTarget.set('new');
  }

  openEditDialog(subject: SubjectResponse): void {
    this.formTarget.set(subject);
  }

  openDeleteDialog(subject: SubjectResponse): void {
    this.deleteTarget.set(subject);
  }

  /** MAT-01: refleja los datos confirmados por la API, no los del formulario. */
  onSubjectSaved(saved: SubjectResponse): void {
    this.formTarget.set(null);
    this.subjects.update((list) => {
      const index = list.findIndex((subject) => subject.id === saved.id);
      if (index === -1) return [...list, saved];
      const next = [...list];
      next[index] = saved;
      return next;
    });
  }

  onSubjectDeleted(deleted: SubjectResponse): void {
    this.deleteTarget.set(null);
    this.subjects.update((list) => list.filter((subject) => subject.id !== deleted.id));
  }

  onDialogCancelled(): void {
    this.formTarget.set(null);
    this.deleteTarget.set(null);
  }
}
