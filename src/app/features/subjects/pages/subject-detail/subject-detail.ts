import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import type { AttendanceControlResponse, EstadoControlAsistencia, SubjectResponse } from '../../models';
import { SubjectsService } from '../../services/subjects.service';
import { DeleteSubjectDialog } from '../../components/delete-subject-dialog/delete-subject-dialog';
import { SubjectFormDialog } from '../../components/subject-form-dialog/subject-form-dialog';
import { SubjectRecentNotes } from '../../components/subject-recent-notes/subject-recent-notes';
import { dangerButton, primaryButton, secondaryButton } from '../../dialog-styles';

type DetailState = 'loading' | 'error' | 'ready';
type AttendanceHistoryState = 'loading' | 'error' | 'ready';

interface AttendanceTotals {
  present: number;
  absent: number;
  justified: number;
}

interface DetailSection {
  id: string;
  icon: string;
  title: string;
  description: string;
}

/**
 * Contenedor del detalle de materia (/estudio/materias/:id).
 *
 * MAT-03: muestra la cursada, permite registrar asistencia y conserva el
 * historial asociado a la materia.
  * APU-01: muestra un acceso de solo lectura a los apuntes recientes de la materia.
 */
@Component({
  selector: 'app-subject-detail',
  imports: [RouterLink, SubjectRecentNotes, SubjectFormDialog, DeleteSubjectDialog],
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
  readonly attendanceRecords = signal<readonly AttendanceControlResponse[]>([]);
  readonly attendanceHistoryState = signal<AttendanceHistoryState>('loading');
  readonly attendanceTotals = computed(() => this.attendanceRecords().reduce<AttendanceTotals>((totals, control) => {
    if (control.estado === 'PRESENTE') totals.present += 1;
    if (control.estado === 'AUSENTE') totals.absent += 1;
    if (control.estado === 'JUSTIFICADA') totals.justified += 1;
    return totals;
  }, { present: 0, absent: 0, justified: 0 }));
  readonly attendanceRate = computed(() => {
    const totals = this.attendanceTotals();
    const marked = totals.present + totals.absent + totals.justified;
    return marked === 0 ? null : Math.round((totals.present / marked) * 100);
  });
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
      this.attendanceRecords.set([]);
      this.attendanceHistoryState.set('loading');
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
          this.loadFirstPresentDate(subject);
        },
        error: () => {
          this.subject.set(null);
          this.state.set('error');
        },
      });
  }

  private loadFirstPresentDate(subject: SubjectResponse): void {
    if ((subject.horarios?.length ?? 0) === 0) {
      this.firstPresentDate.set(null);
      this.attendanceRecords.set([]);
      this.attendanceHistoryState.set('ready');
      return;
    }

    this.attendanceHistoryState.set('loading');
    this.attendanceRecords.set([]);
    const endDate = subject.fechaFin ?? this.localIsoDate(new Date());
    const startDate = this.historyStartDate(endDate);
    forkJoin({
      controls: this.subjects.attendanceControls(subject.id, startDate, endDate),
      excludedDates: this.subjects.noClassDates(subject.id, startDate, endDate),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ controls, excludedDates }) => {
          const validControls = controls.filter((control) => !excludedDates.includes(control.fecha));
          const firstPresentDate = validControls
            .filter((control) => control.estado === 'PRESENTE')
            .map((control) => control.fecha)
            .sort()[0] ?? null;
          this.firstPresentDate.set(firstPresentDate);
          this.attendanceRecords.set(validControls
            .filter((control) => control.estado !== 'PENDIENTE')
            .sort((first, second) => second.fecha.localeCompare(first.fecha)
              || second.horaInicio.localeCompare(first.horaInicio)
              || second.numero - first.numero));
          this.attendanceHistoryState.set('ready');
        },
        error: () => {
          this.firstPresentDate.set(null);
          this.attendanceHistoryState.set('error');
        },
      });
  }

  private localIsoDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private historyStartDate(endDate: string): string {
    const [year, month, day] = endDate.split('-').map(Number);
    const start = new Date(Date.UTC(year, month - 1, day));
    start.setUTCDate(start.getUTCDate() - 365);
    return `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}-${String(start.getUTCDate()).padStart(2, '0')}`;
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
    this.loadFirstPresentDate(saved);
  }

  onSubjectDeleted(): void {
    this.deleteTarget.set(null);
    void this.router.navigateByUrl('/estudio/materias');
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

  formatAttendanceDate(value: string): string {
    return new Intl.DateTimeFormat('es-AR', {
      weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
    }).format(new Date(`${value}T00:00:00Z`));
  }

  attendanceLabel(status: EstadoControlAsistencia): string {
    const labels: Record<EstadoControlAsistencia, string> = {
      PRESENTE: 'Presente',
      AUSENTE: 'Ausente',
      JUSTIFICADA: 'Justificada',
      PENDIENTE: 'Pendiente',
    };
    return labels[status];
  }

  attendanceIcon(status: EstadoControlAsistencia): string {
    const icons: Record<EstadoControlAsistencia, string> = {
      PRESENTE: 'check_circle',
      AUSENTE: 'cancel',
      JUSTIFICADA: 'verified',
      PENDIENTE: 'radio_button_unchecked',
    };
    return icons[status];
  }

  attendanceTone(status: EstadoControlAsistencia): string {
    const tones: Record<EstadoControlAsistencia, string> = {
      PRESENTE: 'text-[var(--attendance-present-ink)]',
      AUSENTE: 'text-[var(--attendance-absent-ink)]',
      JUSTIFICADA: 'text-[var(--attendance-justified-ink)]',
      PENDIENTE: 'text-[var(--theme-muted)]',
    };
    return tones[status];
  }

  attendanceBlockLabel(control: AttendanceControlResponse): string | null {
    const schedule = this.subject()?.horarios.find((item) => item.id === control.horarioId);
    return schedule?.controlesAsistencia === 2 ? `Bloque ${control.numero}` : null;
  }

  loadAttendanceHistoryAgain(): void {
    const current = this.subject();
    if (current) this.loadFirstPresentDate(current);
  }
}
