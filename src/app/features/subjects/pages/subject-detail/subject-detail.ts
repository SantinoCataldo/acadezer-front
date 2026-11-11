import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { SubjectResponse } from '../../models';
import { SubjectsService } from '../../services/subjects.service';
import { DeleteSubjectDialog } from '../../components/delete-subject-dialog/delete-subject-dialog';
import { SubjectFormDialog } from '../../components/subject-form-dialog/subject-form-dialog';
import { dangerButton, secondaryButton } from '../../dialog-styles';

type DetailState = 'loading' | 'error' | 'ready';

interface DetailSection {
  id: string;
  icon: string;
  title: string;
  description: string;
}

/**
 * Contenedor del detalle de materia (/materias/:id).
 *
 * MAT-03: consulta los datos de la materia seleccionada y es el contenedor de
 * las cuatro secciones (apuntes, pendientes, evaluaciones y asistencias).
 * Hoy las secciones se muestran como próximas entregas: el componente de
 * apuntes lo integra el equipo de apuntes y cada funcionalidad trae la suya.
 */
@Component({
  selector: 'app-subject-detail',
  imports: [RouterLink, SubjectFormDialog, DeleteSubjectDialog],
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

  readonly sections: readonly DetailSection[] = [
    {
      id: 'apuntes',
      icon: 'description',
      title: 'Apuntes',
      description: 'Tus apuntes de texto para esta materia.',
    },
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
    {
      id: 'asistencias',
      icon: 'fact_check',
      title: 'Asistencias',
      description: 'Presente, ausente o justificada, registro por fecha.',
    },
  ];

  // Referencias para la plantilla.
  readonly secondaryButtonClass = secondaryButton;
  readonly dangerButtonClass = dangerButton;

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.formTarget.set(null);
      this.deleteTarget.set(null);
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
    void this.router.navigateByUrl('/materias');
  }

  onDialogCancelled(): void {
    this.formTarget.set(null);
    this.deleteTarget.set(null);
  }

  retry(): void {
    this.load(this.route.snapshot.paramMap.get('id'));
  }
}
