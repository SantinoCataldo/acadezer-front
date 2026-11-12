import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, Observable } from 'rxjs';
import { SubjectsService } from '../../services/subjects.service';
import type { AttendanceControlResponse, DiaSemana, EstadoControlAsistencia, SubjectResponse } from '../../models';

interface CalendarCell {
  key: number;
  fecha: string | null;
  dia: string;
  inMonth: boolean;
  scheduled: boolean;
  excluded: boolean;
  selected: boolean;
  future: boolean;
}

const WEEKDAYS_BY_DATE: readonly DiaSemana[] = [
  'DOMINGO',
  'LUNES',
  'MARTES',
  'MIERCOLES',
  'JUEVES',
  'VIERNES',
  'SABADO',
];

const WEEKDAY_HEADERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function isoDate(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function localIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function historyStartDate(endDate: string): string {
  const start = parseIsoDate(endDate);
  start.setUTCDate(start.getUTCDate() - 365);
  return isoDate(start);
}

function responseErrorMessage(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse)) return null;
  const body: unknown = error.error;
  if (typeof body !== 'object' || body === null || !('message' in body)) return null;
  return typeof body.message === 'string' && body.message.trim() ? body.message : null;
}

@Component({
  selector: 'app-attendance-board',
  templateUrl: './attendance-board.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class AttendanceBoard {
  readonly subject = input.required<SubjectResponse>();
  readonly firstPresentDateChange = output<string | null>();

  private readonly subjects = inject(SubjectsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly state = signal<'loading' | 'error' | 'ready'>('loading');
  readonly controls = signal<readonly AttendanceControlResponse[]>([]);
  readonly noClassDates = signal<readonly string[]>([]);
  readonly selectedDate = signal<string | null>(null);
  readonly actionKey = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly month = signal(this.firstDayOfMonth(parseIsoDate(localIsoDate(new Date()))));
  readonly weekdayHeaders = WEEKDAY_HEADERS;

  readonly monthTitle = computed(() =>
    new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(this.month()),
  );
  readonly selectedControls = computed(() => {
    const date = this.selectedDate();
    return date ? this.controls().filter((control) => control.fecha === date).sort((a, b) => a.numero - b.numero) : [];
  });
  readonly selectedDateExcluded = computed(() => {
    const date = this.selectedDate();
    return date !== null && this.noClassDates().includes(date);
  });
  readonly selectedDateScheduled = computed(() => {
    const date = this.selectedDate();
    return date !== null && this.isScheduled(date);
  });
  readonly summary = computed(() => {
    const excludedDates = new Set(this.noClassDates());
    const marked = this.controls().filter(
      (control) => control.estado !== 'PENDIENTE' && !excludedDates.has(control.fecha),
    );
    const present = marked.filter((control) => control.estado === 'PRESENTE').length;
    const absent = marked.filter((control) => control.estado === 'AUSENTE').length;
    const justified = marked.filter((control) => control.estado === 'JUSTIFICADA').length;
    return {
      present,
      absent,
      justified,
      marked: marked.length,
      percentage: marked.length === 0 ? null : Math.round((present / marked.length) * 100),
    };
  });
  readonly calendarCells = computed(() => this.buildCalendarCells());

  constructor() {
    effect(() => this.load(this.subject()));
  }

  load(subject = this.subject()): void {
    if (subject.horarios.length === 0) {
      this.controls.set([]);
      this.noClassDates.set([]);
      this.firstPresentDateChange.emit(null);
      this.selectedDate.set(null);
      this.actionKey.set(null);
      this.errorMessage.set(null);
      this.state.set('ready');
      return;
    }

    if (this.state() !== 'ready') this.state.set('loading');
    this.errorMessage.set(null);
    const endDate = subject.fechaFin ?? localIsoDate(new Date());
    const startDate = historyStartDate(endDate);
    const controlRequest = this.subjects.attendanceControls(subject.id, startDate, endDate);
    const noClassRequest = this.subjects.noClassDates(subject.id, startDate, endDate);

    forkJoin({
      controls: controlRequest,
      dates: noClassRequest,
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const controls = response.controls;
          const noClassDates = response.dates;
          this.controls.set(controls);
          this.noClassDates.set(noClassDates);
          const firstPresentDate = controls
            .filter((control) => control.estado === 'PRESENTE' && !noClassDates.includes(control.fecha))
            .map((control) => control.fecha)
            .sort()[0] ?? null;
          this.firstPresentDateChange.emit(firstPresentDate);
          this.state.set('ready');
          this.actionKey.set(null);
          this.clampMonthToCourse();
          const current = this.selectedDate();
          if (!current || !this.isWithinCourse(current)) this.selectedDate.set(this.firstScheduledDate());
        },
        error: () => {
          this.state.set('error');
          this.errorMessage.set('No pudimos cargar las asistencias. Revisá la conexión e intentá de nuevo.');
        },
      });
  }

  moveMonth(offset: number): void {
    if (!this.canMoveMonth(offset)) return;
    const current = this.month();
    const next = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + offset, 1));
    this.month.set(next);
  }

  canMoveMonth(offset: number): boolean {
    const subject = this.subject();
    const current = this.month();
    const next = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + offset, 1));
    const endDate = subject.fechaFin ?? localIsoDate(new Date());
    const start = this.firstDayOfMonth(parseIsoDate(historyStartDate(endDate)));
    const end = this.firstDayOfMonth(parseIsoDate(endDate));
    return next >= start && next <= end;
  }

  selectDate(date: string): void {
    if (!this.isScheduled(date) && !this.noClassDates().includes(date)) return;
    this.selectedDate.set(date);
    this.errorMessage.set(null);
  }

  isFutureDate(date: string): boolean {
    return date > localIsoDate(new Date());
  }

  setStatus(control: AttendanceControlResponse, estado: Exclude<EstadoControlAsistencia, 'PENDIENTE'>): void {
    if (this.actionKey() !== null || control.estado === estado) return;
    this.runAction(
      `control-${control.horarioId}-${control.fecha}-${control.numero}`,
      () => this.subjects.setAttendanceControl(this.subject().id, control.horarioId, control.fecha, control.numero, { estado }),
    );
  }

  resetControl(control: AttendanceControlResponse): void {
    if (this.actionKey() !== null || control.id === null) return;
    this.runAction(
      `control-${control.horarioId}-${control.fecha}-${control.numero}`,
      () => this.subjects.resetAttendanceControl(this.subject().id, control.horarioId, control.fecha, control.numero),
    );
  }

  toggleNoClass(): void {
    const date = this.selectedDate();
    if (!date || this.actionKey() !== null) return;
    const excluded = this.noClassDates().includes(date);
    this.runAction(`date-${date}`, () =>
      excluded ? this.subjects.includeClassDate(this.subject().id, date) : this.subjects.excludeClassDate(this.subject().id, date),
    );
  }

  isActionPending(key: string): boolean {
    return this.actionKey() === key;
  }

  statusButtonClass(control: AttendanceControlResponse, status: Exclude<EstadoControlAsistencia, 'PENDIENTE'>): string {
    const selected = control.estado === status;
    const selectedColors = {
      PRESENTE: 'bg-[var(--attendance-present-soft)] text-[var(--attendance-present-ink)]',
      AUSENTE: 'bg-[var(--attendance-absent-soft)] text-[var(--attendance-absent-ink)]',
      JUSTIFICADA: 'bg-[var(--attendance-justified-soft)] text-[var(--attendance-justified-ink)]',
    }[status];
    const appearance = selected
      ? selectedColors
      : 'bg-[var(--theme-surface-raised)] text-[var(--theme-foreground)] hover:opacity-80';
    return `inline-flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-[11px] px-2 text-xs font-semibold transition-[background-color,color,opacity,transform] duration-150 hover:scale-[0.99] active:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent-content)] motion-reduce:transition-none ${appearance}`;
  }

  statusBadgeClass(status: EstadoControlAsistencia): string {
    return {
      PRESENTE: 'bg-[var(--attendance-present-soft)] text-[var(--attendance-present-ink)]',
      AUSENTE: 'bg-[var(--attendance-absent-soft)] text-[var(--attendance-absent-ink)]',
      JUSTIFICADA: 'bg-[var(--attendance-justified-soft)] text-[var(--attendance-justified-ink)]',
      PENDIENTE: 'bg-[var(--theme-surface-high)] text-[var(--theme-muted)]',
    }[status];
  }

  formatSelectedDate(): string {
    const date = this.selectedDate();
    if (!date) return '';
    return new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(parseIsoDate(date));
  }

  statusText(status: EstadoControlAsistencia): string {
    const labels: Record<EstadoControlAsistencia, string> = {
      PRESENTE: 'Presente',
      AUSENTE: 'Ausente',
      JUSTIFICADA: 'Justificada',
      PENDIENTE: 'Pendiente',
    };
    return labels[status];
  }

  private runAction(key: string, action: () => Observable<unknown>): void {
    this.actionKey.set(key);
    this.errorMessage.set(null);
    action().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.load(),
      error: (error: unknown) => {
        this.actionKey.set(null);
        this.errorMessage.set(responseErrorMessage(error) ?? 'No pudimos guardar ese cambio. Intentá de nuevo.');
      },
    });
  }

  private buildCalendarCells(): CalendarCell[] {
    const month = this.month();
    const year = month.getUTCFullYear();
    const monthIndex = month.getUTCMonth();
    const firstDay = new Date(Date.UTC(year, monthIndex, 1));
    const offset = (firstDay.getUTCDay() + 6) % 7;
    const dayCount = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
    const today = localIsoDate(new Date());
    const cells: CalendarCell[] = [];

    for (let index = 0; index < offset; index++) {
      cells.push({ key: index, fecha: null, dia: '', inMonth: false, scheduled: false, excluded: false, selected: false, future: false });
    }
    for (let day = 1; day <= dayCount; day++) {
      const date = isoDate(new Date(Date.UTC(year, monthIndex, day)));
      cells.push({
        key: offset + day,
        fecha: date,
        dia: String(day),
        inMonth: true,
        scheduled: this.isScheduled(date),
        excluded: this.noClassDates().includes(date),
        selected: this.selectedDate() === date,
        future: date > today,
      });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ key: cells.length, fecha: null, dia: '', inMonth: false, scheduled: false, excluded: false, selected: false, future: false });
    }
    return cells;
  }

  private isScheduled(date: string): boolean {
    const subject = this.subject();
    if (!this.isWithinCourse(date) || this.noClassDates().includes(date)) return false;
    const weekday = WEEKDAYS_BY_DATE[parseIsoDate(date).getUTCDay()];
    return (subject.horarios ?? []).some((schedule) => schedule.diaSemana === weekday);
  }

  private isWithinCourse(date: string): boolean {
    const subject = this.subject();
    const end = subject.fechaFin ?? localIsoDate(new Date());
    return date <= end && date >= historyStartDate(end);
  }

  private firstScheduledDate(): string | null {
    const today = localIsoDate(new Date());
    const dates = this.controls().map((control) => control.fecha).filter((date) => this.isScheduled(date));
    const futureOrToday = dates.find((date) => date >= today);
    return futureOrToday ?? dates.at(-1) ?? null;
  }

  private firstDayOfMonth(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  }

  private clampMonthToCourse(): void {
    const subject = this.subject();
    const endDate = subject.fechaFin ?? localIsoDate(new Date());
    const start = this.firstDayOfMonth(parseIsoDate(historyStartDate(endDate)));
    const end = this.firstDayOfMonth(parseIsoDate(endDate));
    const current = this.month();
    if (current < start) this.month.set(start);
    else if (current > end) this.month.set(end);
  }
}
