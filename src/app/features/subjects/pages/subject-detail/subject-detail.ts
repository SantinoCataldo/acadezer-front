import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { SubjectResponse } from '../../models';
import { SubjectsService } from '../../services/subjects.service';
import { AttendanceBoard } from '../../components/attendance-board/attendance-board';
import { DeleteSubjectDialog } from '../../components/delete-subject-dialog/delete-subject-dialog';
import { SubjectFormDialog } from '../../components/subject-form-dialog/subject-form-dialog';
import { NotesSection } from '../../components/notes-section/notes-section';
import { dangerButton, primaryButton, secondaryButton } from '../../dialog-styles';

type DetailState = 'loading' | 'error' | 'ready';

interface DetailSection {
  id: string;
  icon: string;
  title: string;
  description: string;
}

/**
 * Contenedor del detalle de materia (/estudio/materias/:id).
 *
 * MAT-03: consulta los datos de la materia seleccionada y ofrece el registro de
 * asistencia. APU-01: debajo del tablero de asistencia monta la sección Apuntes.
 */
@Component({
  selector: 'app-subject-detail',
  imports: [RouterLink, AttendanceBoard, NotesSection, SubjectFormDialog, DeleteSubjectDialog],
  templateUrl: './subject-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubjectDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly subjects = inject(SubjectsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly subject = signal<SubjectResponse | null>(null);
  readonly state = signal<DetailState>('loading');
  readonly formTarget = signal<SubjectResponse | null>(null);
  readonly deleteTarget = signal<SubjectResponse | null>(null);
  readonly firstPresentDate = signal<string | null>(null);
  readonly finishConfirmation = signal(false);
  readonly finishing = signal(false);
  readonly finishError = signal<string | null>(null);

  readonly sections: readonly DetailSection[] = [
    {
      id: 'pendientes',
      icon: 'checklist',
      title: 'Pendientes',
      description: 'Tareas con fecha límite y estado de completado.',
    },
    {
      id: 'evaluaciones',
      icon: 'assignment',
      title: 'Evaluaciones',
      description: 'Fechas de examen y calificaciones de 0 a 10.',
    },
  ];

  // Referencias para la plantilla.
  readonly secondaryButtonClass = secondaryButton;
  readonly dangerButtonClass = dangerButton;
  readonly primaryButtonClass = primaryButton;

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.formTarget.set(null);
      this.deleteTarget.set(null);
      this.finishConfirmation.set(false);
      this.finishError.set(null);
      this.firstPresentDate.set(null);
      this.load(params.get('id'));
    });
  }

  private load(rawId: string | null): void {
    const id = Number(rawId);
    if (!rawId || !Number.isInteger(id) || id <= 0) {
      this.subject.set(null);
      this.state.set('error');
      return;
    }

    this.state.set('loading');
    this.subjects
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (subject) => {
          this.subject.set(subject);
          this.state.set('ready');
        },
        error: () => {
          this.subject.set(null);
          this.state.set('error');
        },
      });
  }

  openEditDialog(): void {
    const current = this.subject();
    if (current) this.formTarget.set(current);
  }

  openDeleteDialog(): void {
    const current = this.subject();
    if (current) this.deleteTarget.set(current);
  }

  onSubjectSaved(saved: SubjectResponse): void {
    this.formTarget.set(null);
    this.subject.set(saved);
  }

  onSubjectDeleted(): void {
    this.deleteTarget.set(null);
    void this.router.navigateByUrl('/estudio');
  }

  requestFinish(): void {
    this.finishError.set(null);
    this.finishConfirmation.set(true);
  }

  cancelFinish(): void {
    this.finishConfirmation.set(false);
    this.finishError.set(null);
  }

  finishCourse(): void {
    const current = this.subject();
    if (!current || current.fechaFin || !this.firstPresentDate() || this.finishing()) return;
    this.finishing.set(true);
    this.finishError.set(null);
    this.subjects
      .finish(current.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (saved) => {
          this.subject.set(saved);
          this.finishConfirmation.set(false);
          this.finishing.set(false);
        },
        error: () => {
          this.finishing.set(false);
          this.finishError.set('No pudimos finalizar la cursada. Intentá de nuevo.');
        },
      });
  }

  onDialogCancelled(): void {
    this.formTarget.set(null);
    this.deleteTarget.set(null);
  }

  retry(): void {
    this.load(this.route.snapshot.paramMap.get('id'));
  }

  formatDate(value: string | null): string {
    if (!value) return 'Fecha pendiente';
    return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(`${value}T00:00:00Z`));
  }

  formatDateRange(start: string | null, end: string | null, firstPresent: string | null): string {
    if (!start) return 'Fecha de inicio pendiente';
    if (firstPresent && !end) return `En curso · desde ${this.formatDate(firstPresent)}`;
    if (firstPresent && end) return `Cursada · ${this.formatDate(firstPresent)} – ${this.formatDate(end)}`;
    return `Inicio previsto · ${this.formatDate(start)}${end ? ` – ${this.formatDate(end)}` : ''}`;
  }

  shortWeekday(value: string): string {
    return value.slice(0, 3).toLowerCase();
  }
}
