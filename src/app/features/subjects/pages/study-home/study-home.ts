import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of, timeout } from 'rxjs';
import type { AttendanceControlResponse, EstadoControlAsistencia, SubjectResponse } from '../../models';
import { SubjectsService } from '../../services/subjects.service';
import { TareaService } from '../../../tareas/tarea-service';
import type { Tarea } from '../../../tareas/tarea';
import { EvaluacionService } from '../../../evaluaciones/evaluacion.service';
import type { EvaluacionResponse } from '../../../evaluaciones/models';

interface DailySubject {
  subject: SubjectResponse;
  controls: readonly AttendanceControlResponse[];
}

export interface EvaluacionHomeItem extends EvaluacionResponse {
  materiaNombre: string;
}

function todayInArgentina(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '00';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function weekdayFor(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatFechaCorta(isoDate: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date(`${isoDate}T12:00:00-03:00`));
}

const weekdayCodes = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'] as const;

@Component({
  selector: 'app-study-home',
  imports: [RouterLink],
  templateUrl: './study-home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class StudyHome {
  private readonly subjectsService = inject(SubjectsService);
  private readonly tareaService = inject(TareaService);
  private readonly evaluacionService = inject(EvaluacionService);
  private readonly destroyRef = inject(DestroyRef);

  readonly today = todayInArgentina();
  readonly state = signal<'loading' | 'error' | 'ready'>('loading');
  readonly dailySubjects = signal<readonly DailySubject[]>([]);
  readonly busyControl = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly tareasState = signal<'loading' | 'error' | 'ready'>('loading');
  readonly proximasTareas = signal<readonly Tarea[]>([]);

  readonly evaluacionesState = signal<'loading' | 'error' | 'ready'>('loading');
  readonly proximasEvaluaciones = signal<readonly EvaluacionHomeItem[]>([]);

  readonly allSubjects = signal<readonly SubjectResponse[]>([]);
  readonly subjectsMap = computed(() => {
    const map = new Map<number, SubjectResponse>();
    for (const s of this.allSubjects()) {
      map.set(s.id, s);
    }
    return map;
  });

  readonly statusOptions = [
    { status: 'PRESENTE', label: 'Presente', icon: 'check_circle' },
    { status: 'AUSENTE', label: 'Ausente', icon: 'cancel' },
    { status: 'JUSTIFICADA', label: 'Justificada', icon: 'verified' },
  ] as const;

  readonly title = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date(`${this.today}T12:00:00-03:00`));

  constructor() {
    this.load();
    this.loadTareas();
  }

  load(): void {
    if (this.state() !== 'ready') this.state.set('loading');
    this.errorMessage.set(null);
    this.subjectsService.list().pipe(timeout({ first: 12000 }), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (subjects) => {
        this.allSubjects.set(subjects);
        const activeSubjects = subjects.filter((subject) => !subject.fechaFin || this.today <= subject.fechaFin);
        if (this.evaluacionesState() !== 'ready') {
          this.fetchEvaluacionesForSubjects(activeSubjects);
        }

        const weekday = weekdayCodes[weekdayFor(this.today)];
        const candidates = subjects.filter((subject) =>
          (!subject.fechaFin || this.today <= subject.fechaFin)
          && subject.horarios.some((schedule) => schedule.diaSemana === weekday),
        );
        if (candidates.length === 0) {
          this.dailySubjects.set([]);
          this.busyControl.set(null);
          this.state.set('ready');
          return;
        }
        let partialLoad = false;
        forkJoin(candidates.map((subject) => forkJoin({
          controls: this.subjectsService.attendanceControls(subject.id, this.today, this.today).pipe(
            timeout({ first: 12000 }),
            catchError(() => {
              partialLoad = true;
              return of(this.pendingControls(subject, this.today));
            }),
          ),
          excludedDates: this.subjectsService.noClassDates(subject.id, this.today, this.today).pipe(
            timeout({ first: 12000 }),
            catchError(() => {
              partialLoad = true;
              return of([] as string[]);
            }),
          ),
        }))).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: (results) => {
            this.dailySubjects.set(candidates.map((subject, index) => ({
              subject,
              controls: ((results[index]?.controls.length ? results[index].controls : this.pendingControls(subject, this.today))
                .filter((control) => !results[index]?.excludedDates.includes(control.fecha))).sort((first, second) =>
                first.horaInicio.localeCompare(second.horaInicio) || first.numero - second.numero,
              ),
            })).filter((item) => item.controls.length > 0));
            this.busyControl.set(null);
            this.errorMessage.set(partialLoad ? 'Algunos datos de asistencia no se cargaron. Podés registrar o actualizar igualmente.' : null);
            this.state.set('ready');
          },
          error: () => {
            this.dailySubjects.set([]);
            this.busyControl.set(null);
            this.state.set('error');
          },
        });
      },
      error: () => {
        this.busyControl.set(null);
        this.state.set('error');
        if (this.evaluacionesState() !== 'ready') {
          this.evaluacionesState.set('error');
        }
      },
    });
  }

  loadTareas(): void {
    this.tareasState.set('loading');
    const hasta = addDays(this.today, 7);
    this.tareaService
      .getProximas(this.today, hasta)
      .pipe(timeout({ first: 12000 }), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tareas) => {
          const sorted = [...tareas].sort((a, b) => {
            if (a.completado !== b.completado) {
              return a.completado ? 1 : -1;
            }
            if (a.fechaLimite && b.fechaLimite) {
              return a.fechaLimite.localeCompare(b.fechaLimite);
            }
            if (a.fechaLimite) return -1;
            if (b.fechaLimite) return 1;
            return a.titulo.localeCompare(b.titulo);
          });
          this.proximasTareas.set(sorted);
          this.tareasState.set('ready');
        },
        error: () => {
          this.proximasTareas.set([]);
          this.tareasState.set('error');
        },
      });
  }

  loadEvaluaciones(): void {
    this.evaluacionesState.set('loading');
    const cached = this.allSubjects();
    if (cached.length > 0) {
      const active = cached.filter((s) => !s.fechaFin || this.today <= s.fechaFin);
      this.fetchEvaluacionesForSubjects(active);
      return;
    }

    this.subjectsService
      .list()
      .pipe(timeout({ first: 12000 }), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (subjects) => {
          this.allSubjects.set(subjects);
          const active = subjects.filter((s) => !s.fechaFin || this.today <= s.fechaFin);
          this.fetchEvaluacionesForSubjects(active);
        },
        error: () => {
          this.proximasEvaluaciones.set([]);
          this.evaluacionesState.set('error');
        },
      });
  }

  private fetchEvaluacionesForSubjects(activeSubjects: readonly SubjectResponse[]): void {
    if (activeSubjects.length === 0) {
      this.proximasEvaluaciones.set([]);
      this.evaluacionesState.set('ready');
      return;
    }

    forkJoin(
      activeSubjects.map((subject) =>
        this.evaluacionService.listByMateria(subject.id).pipe(
          timeout({ first: 12000 }),
          catchError(() => of([] as EvaluacionResponse[])),
        ),
      ),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (results) => {
          const combined: EvaluacionHomeItem[] = [];
          results.forEach((list, index) => {
            const subject = activeSubjects[index];
            for (const item of list) {
              combined.push({
                ...item,
                materiaNombre: subject.nombre,
              });
            }
          });

          const proximas = combined
            .filter((e) => e.fecha >= this.today || e.calificacion === null)
            .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.nombre.localeCompare(b.nombre));

          this.proximasEvaluaciones.set(proximas);
          this.evaluacionesState.set('ready');
        },
        error: () => {
          this.proximasEvaluaciones.set([]);
          this.evaluacionesState.set('error');
        },
      });
  }

  mark(subject: SubjectResponse, control: AttendanceControlResponse, estado: Exclude<EstadoControlAsistencia, 'PENDIENTE'>): void {
    const key = `${subject.id}-${control.horarioId}-${control.numero}`;
    if (this.busyControl() !== null) return;
    if (control.estado === estado) {
      this.reset(subject, control);
      return;
    }
    this.busyControl.set(key);
    this.errorMessage.set(null);
    this.subjectsService.setAttendanceControl(subject.id, control.horarioId, control.fecha, control.numero, { estado })
      .pipe(timeout({ first: 12000 }), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.load(),
        error: () => {
          this.busyControl.set(null);
          this.errorMessage.set('No pudimos guardar la asistencia. Intentá de nuevo.');
        },
      });
  }

  reset(subject: SubjectResponse, control: AttendanceControlResponse): void {
    const key = `${subject.id}-${control.horarioId}-${control.numero}`;
    if (this.busyControl() !== null || control.id === null) return;
    this.busyControl.set(key);
    this.errorMessage.set(null);
    this.subjectsService.resetAttendanceControl(subject.id, control.horarioId, control.fecha, control.numero)
      .pipe(timeout({ first: 12000 }), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.load(),
        error: () => {
          this.busyControl.set(null);
          this.errorMessage.set('No pudimos deshacer ese registro. Intentá de nuevo.');
        },
      });
  }

  statusLabel(status: EstadoControlAsistencia): string {
    const labels: Record<EstadoControlAsistencia, string> = {
      PRESENTE: 'Presente', AUSENTE: 'Ausente', JUSTIFICADA: 'Justificada', PENDIENTE: 'Pendiente',
    };
    return labels[status];
  }

  statusButtonClass(current: EstadoControlAsistencia, target: Exclude<EstadoControlAsistencia, 'PENDIENTE'>): string {
    const selected = {
      PRESENTE: 'bg-[var(--attendance-present-soft)] text-[var(--attendance-present-ink)]',
      AUSENTE: 'bg-[var(--attendance-absent-soft)] text-[var(--attendance-absent-ink)]',
      JUSTIFICADA: 'bg-[var(--attendance-justified-soft)] text-[var(--attendance-justified-ink)]',
    }[target];
    const appearance = current === target
      ? selected
      : 'bg-[var(--theme-surface-raised)] text-[var(--theme-foreground)] hover:opacity-80';
    return `inline-flex min-h-11 min-w-0 cursor-pointer items-center justify-center gap-1 rounded-[12px] px-1.5 text-[11px] font-semibold transition-[background-color,color,transform] duration-150 hover:scale-[0.99] active:scale-[1.01] disabled:cursor-wait disabled:opacity-60 disabled:transform-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent-content)] motion-reduce:transition-none sm:gap-1.5 sm:px-2 sm:text-xs ${appearance}`;
  }

  subjectInitial(name: string): string {
    return Array.from(name.trim())[0]?.toLocaleUpperCase('es-AR') ?? '?';
  }

  materiaNombre(materiaId: number): string {
    return this.subjectsMap().get(materiaId)?.nombre ?? 'Materia';
  }

  fechaRelativa(isoDate: string | null): string {
    if (!isoDate) return 'Sin fecha';
    const cleanDate = isoDate.slice(0, 10);
    if (cleanDate === this.today) return 'Hoy';
    const tomorrow = addDays(this.today, 1);
    if (cleanDate === tomorrow) return 'Mañana';
    return formatFechaCorta(cleanDate);
  }

  private pendingControls(subject: SubjectResponse, fecha: string): AttendanceControlResponse[] {
    const weekday = weekdayCodes[weekdayFor(fecha)];
    return subject.horarios
      .filter((schedule) => schedule.diaSemana === weekday)
      .flatMap((schedule) => {
        const start = this.minutes(schedule.horaInicio);
        const end = this.minutes(schedule.horaFin);
        return Array.from({ length: schedule.controlesAsistencia }, (_, index) => {
          const blockStart = start + ((end - start) * index) / schedule.controlesAsistencia;
          const blockEnd = start + ((end - start) * (index + 1)) / schedule.controlesAsistencia;
          return {
            id: null,
            horarioId: schedule.id,
            fecha,
            numero: (index + 1) as 1 | 2,
            horaInicio: this.timeString(blockStart),
            horaFin: this.timeString(blockEnd),
            estado: 'PENDIENTE' as const,
          };
        });
      });
  }

  private minutes(value: string): number {
    const [hours = '0', minutes = '0'] = value.split(':');
    return Number(hours) * 60 + Number(minutes);
  }

  private timeString(value: number): string {
    const totalMinutes = Math.round(value);
    return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}:00`;
  }
}
