import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, forkJoin, of, timeout } from 'rxjs';
import type { AttendanceControlResponse, DiaSemana, EstadoControlAsistencia, SubjectResponse } from '../../models';
import { SubjectsService } from '../../services/subjects.service';

interface CalendarDay {
  key: number;
  date: string | null;
  dayNumber: string;
  scheduled: boolean;
  controls: readonly SubjectControlEntry[];
}

interface SubjectControlEntry {
  subjectId: number;
  subjectName: string;
  control: AttendanceControlResponse;
}

interface AttendanceTotals {
  present: number;
  absent: number;
  justified: number;
}

const dayByIndex: readonly DiaSemana[] = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
const weekdayHeaders: Readonly<Record<DiaSemana, string>> = {
  LUNES: 'LU', MARTES: 'MA', MIERCOLES: 'MI', JUEVES: 'JU', VIERNES: 'VI', SABADO: 'SA', DOMINGO: 'DO',
};
function localDateString(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '00';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function dateFromIso(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function isoFromUtc(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

@Component({
  selector: 'app-study-calendar',
  templateUrl: './study-calendar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class StudyCalendar {
  private readonly subjectsService = inject(SubjectsService);
  private readonly destroyRef = inject(DestroyRef);
  private monthLoadId = 0;
  private mobileTouchStartY: number | null = null;
  private mobileCloseTimer: number | null = null;

  readonly today = localDateString(new Date());
  readonly state = signal<'loading' | 'error' | 'ready'>('loading');
  readonly loadingCalendarCells = Array.from({ length: 42 }, (_, index) => index);
  readonly loadingSessionCards = [0, 1] as const;
  readonly loadingSummaryCards = [0, 1] as const;
  readonly loadingControls = signal(false);
  readonly busyControl = signal<string | null>(null);
  readonly controlExpansion = signal<ReadonlyMap<string, boolean>>(new Map());
  readonly errorMessage = signal<string | null>(null);
  readonly subjects = signal<readonly SubjectResponse[]>([]);
  readonly controls = signal<readonly SubjectControlEntry[]>([]);
  readonly excludedDates = signal<ReadonlySet<string>>(new Set());
  readonly excludedDatesBySubject = signal<ReadonlyMap<number, ReadonlySet<string>>>(new Map());
  readonly historyControls = signal<readonly SubjectControlEntry[]>([]);
  readonly historyExcludedDatesBySubject = signal<ReadonlyMap<number, ReadonlySet<string>>>(new Map());
  readonly historyLoading = signal(false);
  readonly historyUnavailable = signal(false);
  readonly selectedSubjectIds = signal<ReadonlySet<number>>(new Set());
  readonly warning = signal<string | null>(null);
  readonly month = signal(this.firstMonth(dateFromIso(this.today)));
  readonly selectedDate = signal(this.today);
  readonly mobileDetailOpen = signal(false);
  readonly mobileDetailVisible = signal(false);
  readonly mobileDragOffset = signal(0);
  readonly mobileDragging = signal(false);
  readonly weekdayHeaders = weekdayHeaders;
  readonly statusOptions = [
    { status: 'PRESENTE', label: 'Presente', icon: 'check_circle' },
    { status: 'AUSENTE', label: 'Ausente', icon: 'cancel' },
    { status: 'JUSTIFICADA', label: 'Justificada', icon: 'verified' },
  ] as const;

  readonly monthTitle = computed(() => new Intl.DateTimeFormat('es-AR', {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(this.month()));
  readonly monthTotals = computed(() => this.summarize(
    this.controls().filter((entry) =>
      entry.control.fecha.startsWith(this.monthKey()) && this.selectedSubjectIds().has(entry.subjectId),
    ),
    this.excludedDatesBySubject(),
  ));
  readonly accumulatedTotals = computed(() => this.summarize(
    this.historyControls().filter((entry) => this.selectedSubjectIds().has(entry.subjectId)),
    this.historyExcludedDatesBySubject(),
  ));
  readonly selectedDateTitle = computed(() => new Intl.DateTimeFormat('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  }).format(dateFromIso(this.selectedDate())));

  readonly selectedEvents = computed(() => {
    const date = this.selectedDate();
    const weekday = dayByIndex[dateFromIso(date).getUTCDay()];
    const selectedIds = this.selectedSubjectIds();
    const scheduledSessions = this.subjects().filter((subject) => selectedIds.has(subject.id) && !this.excludedDatesBySubject().get(subject.id)?.has(date)).flatMap((subject) =>
      (!subject.fechaFin || date <= subject.fechaFin)
        ? subject.horarios.filter((schedule) => schedule.diaSemana === weekday).map((schedule) => ({ subject, schedule }))
        : [],
    );
    const attendance = this.controls().filter((entry) => entry.control.fecha === date && selectedIds.has(entry.subjectId));
    const sessions = scheduledSessions.map(({ subject, schedule }) => {
      const controls = attendance
        .filter((entry) => entry.control.horarioId === schedule.id)
        .map((entry) => entry.control)
        .sort((first, second) => first.numero - second.numero);
      const completeControls = controls.length > 0 || date > this.today
        ? controls
        : this.pendingControls(date, schedule);
      return { subject, schedule, controls: completeControls };
    });
    const scheduledIds = new Set(sessions.map((session) => session.schedule.id));
    return {
      scheduledSessions: sessions,
      attendance: attendance.filter((entry) => !scheduledIds.has(entry.control.horarioId)),
    };
  });

  readonly selectedSubjects = computed(() => this.subjects().filter((subject) => this.selectedSubjectIds().has(subject.id)));
  readonly visibleWeekdays = computed(() => this.makeVisibleWeekdays());
  readonly calendarRows = computed(() => this.makeWeeks());
  readonly subjectSelectionLabel = computed(() => {
    if (this.subjects().length === 0) return this.state() === 'loading' ? '' : 'No hay materias para mostrar.';
    return this.selectedSubjects().length === this.subjects().length
      ? 'Todas las materias activadas. Tocá un día para ver las materias.'
      : `${this.selectedSubjects().length} de ${this.subjects().length} materias activadas.`;
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.mobileCloseTimer !== null) window.clearTimeout(this.mobileCloseTimer);
    });
    this.load();
  }

  load(): void {
    this.state.set('loading');
    this.warning.set(null);
    this.errorMessage.set(null);
    this.subjectsService.list().pipe(timeout({ first: 12000 }), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (subjects) => {
        this.subjects.set(subjects);
        this.selectedSubjectIds.set(new Set(subjects.map((subject) => subject.id)));
        this.loadAttendanceHistory(subjects);
        this.loadMonthControls();
      },
      error: () => {
        this.subjects.set([]);
        this.selectedSubjectIds.set(new Set());
        this.controls.set([]);
        this.excludedDates.set(new Set());
        this.excludedDatesBySubject.set(new Map());
        this.historyControls.set([]);
        this.historyExcludedDatesBySubject.set(new Map());
        this.historyLoading.set(false);
        this.historyUnavailable.set(true);
        this.loadingControls.set(false);
        this.warning.set('No pudimos cargar tus materias. El calendario queda disponible, pero sin tus datos.');
        this.state.set('ready');
      },
    });
  }

  moveMonth(offset: number): void {
    const current = this.month();
    const next = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + offset, 1));
    this.month.set(next);
    this.selectedDate.set(this.firstWeekdayInMonth(next));
    this.controlExpansion.set(new Map());
    this.loadMonthControls();
  }

  selectDate(date: string): void {
    this.selectedDate.set(date);
    this.controlExpansion.set(new Map());
    if (window.matchMedia('(max-width: 1023px)').matches) {
      if (this.mobileCloseTimer !== null) {
        window.clearTimeout(this.mobileCloseTimer);
        this.mobileCloseTimer = null;
      }
      this.mobileDetailVisible.set(true);
      this.mobileDetailOpen.set(true);
    }
  }

  closeMobileDetail(): void {
    if (!this.mobileDetailOpen()) return;
    this.mobileDetailOpen.set(false);
    this.resetMobileDrag();
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 210;
    if (delay === 0) {
      this.mobileDetailVisible.set(false);
      this.mobileCloseTimer = null;
      return;
    }
    if (this.mobileCloseTimer !== null) window.clearTimeout(this.mobileCloseTimer);
    this.mobileCloseTimer = window.setTimeout(() => {
      this.mobileDetailVisible.set(false);
      this.mobileCloseTimer = null;
    }, delay);
  }

  onMobileTouchStart(event: TouchEvent): void {
    if (!this.mobileDetailOpen()) return;
    this.mobileTouchStartY = event.touches.item(0)?.clientY ?? null;
  }

  onMobileTouchMove(event: TouchEvent): void {
    if (!this.mobileDetailOpen() || this.mobileTouchStartY === null) return;
    const touch = event.touches.item(0);
    if (!touch) return;

    const deltaY = touch.clientY - this.mobileTouchStartY;
    const panel = event.currentTarget;
    if (deltaY <= 0 || !(panel instanceof HTMLElement) || panel.scrollTop > 0) return;

    if (deltaY > 6) {
      event.preventDefault();
      this.mobileDragging.set(true);
      this.mobileDragOffset.set(Math.min(deltaY, 240));
    }
  }

  onMobileTouchEnd(): void {
    if (this.mobileDragOffset() > 110) {
      this.closeMobileDetail();
      return;
    }
    this.resetMobileDrag();
  }

  private resetMobileDrag(): void {
    this.mobileTouchStartY = null;
    this.mobileDragOffset.set(0);
    this.mobileDragging.set(false);
  }

  @HostListener('document:keydown.escape')
  closeMobileDetailOnEscape(): void {
    if (this.mobileDetailOpen()) this.closeMobileDetail();
  }

  @HostListener('window:resize')
  closeMobileDetailOnDesktopResize(): void {
    if (window.innerWidth >= 1024) this.closeMobileDetail();
  }

  isControlExpanded(control: AttendanceControlResponse): boolean {
    return this.controlExpansion().get(this.controlKey(control)) ?? control.estado === 'PENDIENTE';
  }

  toggleControlExpansion(control: AttendanceControlResponse): void {
    const key = this.controlKey(control);
    const next = new Map(this.controlExpansion());
    next.set(key, !this.isControlExpanded(control));
    this.controlExpansion.set(next);
  }

  toggleSubject(subjectId: number): void {
    this.selectedSubjectIds.update((current) => {
      const next = new Set(current);
      if (next.has(subjectId)) next.delete(subjectId);
      else next.add(subjectId);
      return next;
    });
  }

  subjectDotClass(): string {
    return 'bg-[var(--theme-accent)]';
  }

  subjectPillClass(): string {
    return 'bg-[var(--theme-surface-raised)] text-[var(--theme-foreground)]';
  }

  mark(subject: SubjectResponse, control: AttendanceControlResponse, estado: Exclude<EstadoControlAsistencia, 'PENDIENTE'>): void {
    const key = `${subject.id}-${control.horarioId}-${control.fecha}-${control.numero}`;
    if (this.busyControl() !== null) return;
    if (control.estado === estado) {
      this.reset(subject, control);
      return;
    }
    this.busyControl.set(key);
    this.errorMessage.set(null);
    this.setControlExpanded(key, false);
    this.upsertControl(subject, { ...control, estado });
    this.subjectsService.setAttendanceControl(subject.id, control.horarioId, control.fecha, control.numero, { estado })
      .pipe(
        timeout({ first: 12000 }),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyControl.set(null)),
      )
      .subscribe({
        next: (savedControl) => this.upsertControl(subject, savedControl),
        error: () => {
          this.upsertControl(subject, control);
          this.setControlExpanded(key, true);
          this.errorMessage.set('No pudimos guardar la asistencia. Intentá de nuevo.');
        },
      });
  }

  reset(subject: SubjectResponse, control: AttendanceControlResponse): void {
    const key = `${subject.id}-${control.horarioId}-${control.fecha}-${control.numero}`;
    if (this.busyControl() !== null || control.estado === 'PENDIENTE') return;
    this.busyControl.set(key);
    this.errorMessage.set(null);
    this.setControlExpanded(key, true);
    this.upsertControl(subject, { ...control, id: null, estado: 'PENDIENTE' });
    this.subjectsService.resetAttendanceControl(subject.id, control.horarioId, control.fecha, control.numero)
      .pipe(
        timeout({ first: 12000 }),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyControl.set(null)),
      )
      .subscribe({
        error: () => {
          this.upsertControl(subject, control);
          this.errorMessage.set('No pudimos deshacer ese registro. Intentá de nuevo.');
        },
      });
  }

  statusLabel(status: AttendanceControlResponse['estado']): string {
    const labels: Record<AttendanceControlResponse['estado'], string> = {
      PRESENTE: 'Presente', AUSENTE: 'Ausente', JUSTIFICADA: 'Justificada', PENDIENTE: 'Pendiente',
    };
    return labels[status];
  }

  dayLabel(date: string): string {
    const formattedDate = new Intl.DateTimeFormat('es-AR', {
      weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
    }).format(dateFromIso(date));
    const selectedIds = this.selectedSubjectIds();
    const attendance = this.controls()
      .filter((entry) => entry.control.fecha === date && selectedIds.has(entry.subjectId))
      .map((entry) => this.statusLabel(entry.control.estado));
    return attendance.length > 0 ? `${formattedDate}, ${attendance.join(', ')}` : formattedDate;
  }

  dayBackground(day: CalendarDay): string | null {
    const marked = day.controls.filter((entry) => entry.control.estado !== 'PENDIENTE');
    if (marked.length === 0) {
      return this.selectedDate() === day.date
        ? 'var(--theme-canvas)'
        : day.scheduled ? 'var(--theme-surface-high)' : 'var(--theme-surface)';
    }

    const counts = new Map<EstadoControlAsistencia, number>();
    for (const entry of day.controls) {
      const status = entry.control.estado === 'PENDIENTE' ? 'PENDIENTE' : entry.control.estado;
      counts.set(status, (counts.get(status) ?? 0) + 1);
    }
    const onlyMarkedStatus = marked[0]?.control.estado;
    if (counts.size === 1 && onlyMarkedStatus && onlyMarkedStatus !== 'PENDIENTE') {
      return this.attendanceCellBackground(onlyMarkedStatus);
    }

    const total = day.controls.length;
    let position = 0;
    const stops: string[] = [];
    for (const [status, count] of counts) {
      const start = (position / total) * 100;
      position += count;
      const end = (position / total) * 100;
      const color = status === 'PENDIENTE'
        ? 'var(--theme-surface-high)'
        : this.attendanceCellBackground(status);
      stops.push(`${color} ${start}% ${end}%`);
    }
    return `linear-gradient(135deg, ${stops.join(', ')})`;
  }

  statusIcon(status: Exclude<EstadoControlAsistencia, 'PENDIENTE'>): string {
    return {
      PRESENTE: 'check_circle',
      AUSENTE: 'cancel',
      JUSTIFICADA: 'verified',
    }[status];
  }

  statusIconClass(status: Exclude<EstadoControlAsistencia, 'PENDIENTE'>): string {
    return {
      PRESENTE: 'text-[var(--attendance-present-ink)]',
      AUSENTE: 'text-[var(--attendance-absent-ink)]',
      JUSTIFICADA: 'text-[var(--attendance-justified-ink)]',
    }[status];
  }

  private attendanceCellBackground(status: Exclude<EstadoControlAsistencia, 'PENDIENTE'>): string {
    const colors: Record<Exclude<EstadoControlAsistencia, 'PENDIENTE'>, string> = {
      PRESENTE: 'var(--attendance-present-soft)',
      AUSENTE: 'var(--attendance-absent-soft)',
      JUSTIFICADA: 'var(--attendance-justified-soft)',
    };
    return colors[status];
  }

  subjectInitial(name: string): string {
    return Array.from(name.trim())[0]?.toLocaleUpperCase('es-AR') ?? '?';
  }

  statusOptionClass(current: AttendanceControlResponse['estado'], target: Exclude<EstadoControlAsistencia, 'PENDIENTE'>): string {
    const base = 'inline-flex min-h-11 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[11px] px-2 text-xs font-semibold transition-[background-color,color,transform] duration-150 hover:scale-[0.99] active:scale-[1.01] disabled:cursor-wait disabled:transform-none disabled:opacity-100 disabled:hover:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent-content)] motion-reduce:transition-none';
    const stateStyles = {
      PRESENTE: 'bg-[var(--attendance-present-soft)] text-[var(--attendance-present-ink)]',
      AUSENTE: 'bg-[var(--attendance-absent-soft)] text-[var(--attendance-absent-ink)]',
      JUSTIFICADA: 'bg-[var(--attendance-justified-soft)] text-[var(--attendance-justified-ink)]',
    };
    if (current !== target) {
      return `${base} bg-[var(--theme-surface-raised)] text-[var(--theme-foreground)] hover:opacity-80`;
    }
    return `${base} ${stateStyles[target]}`;
  }

  statusBadgeClass(status: AttendanceControlResponse['estado']): string {
    const stateStyles: Record<AttendanceControlResponse['estado'], string> = {
      PRESENTE: 'bg-[var(--attendance-present-soft)] text-[var(--attendance-present-ink)]',
      AUSENTE: 'bg-[var(--attendance-absent-soft)] text-[var(--attendance-absent-ink)]',
      JUSTIFICADA: 'bg-[var(--attendance-justified-soft)] text-[var(--attendance-justified-ink)]',
      PENDIENTE: 'bg-[var(--theme-surface-high)] text-[var(--theme-muted)]',
    };
    return stateStyles[status];
  }

  private monthKey(): string {
    return `${this.month().getUTCFullYear()}-${String(this.month().getUTCMonth() + 1).padStart(2, '0')}`;
  }

  private summarize(
    entries: readonly SubjectControlEntry[],
    excludedBySubject: ReadonlyMap<number, ReadonlySet<string>>,
  ): AttendanceTotals {
    return entries.reduce<AttendanceTotals>((totals, entry) => {
      if (excludedBySubject.get(entry.subjectId)?.has(entry.control.fecha)) return totals;
      if (entry.control.estado === 'PRESENTE') totals.present += 1;
      if (entry.control.estado === 'AUSENTE') totals.absent += 1;
      if (entry.control.estado === 'JUSTIFICADA') totals.justified += 1;
      return totals;
    }, { present: 0, absent: 0, justified: 0 });
  }

  private loadAttendanceHistory(subjects: readonly SubjectResponse[]): void {
    this.historyControls.set([]);
    this.historyExcludedDatesBySubject.set(new Map());
    this.historyUnavailable.set(false);
    const today = dateFromIso(this.today);
    today.setUTCDate(today.getUTCDate() - 365);
    const from = isoFromUtc(today);
    const requests = subjects.filter((subject) => !subject.fechaFin || subject.fechaFin >= from);
    if (requests.length === 0) {
      this.historyLoading.set(false);
      return;
    }
    this.historyLoading.set(true);
    let partialFailure = false;
    forkJoin(requests.map((subject) => {
      const until = subject.fechaFin && subject.fechaFin < this.today ? subject.fechaFin : this.today;
      return forkJoin({
        controls: this.subjectsService.attendanceControls(subject.id, from, until).pipe(
          timeout({ first: 12000 }),
          catchError(() => {
            partialFailure = true;
            return of([] as AttendanceControlResponse[]);
          }),
        ),
        excludedDates: this.subjectsService.noClassDates(subject.id, from, until).pipe(
          timeout({ first: 12000 }),
          catchError(() => {
            partialFailure = true;
            return of([] as string[]);
          }),
        ),
      });
    })).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.historyLoading.set(false)),
    ).subscribe({
      next: (responses) => {
        this.historyControls.set(requests.flatMap((subject, index) =>
          (responses[index]?.controls ?? []).map((control) => ({ subjectId: subject.id, subjectName: subject.nombre, control })),
        ));
        this.historyExcludedDatesBySubject.set(new Map(requests.map((subject, index) => [
          subject.id,
          new Set(responses[index]?.excludedDates ?? []),
        ])));
        this.historyUnavailable.set(partialFailure);
      },
      error: () => {
        this.historyUnavailable.set(true);
      },
    });
  }

  private loadMonthControls(): void {
    const loadId = ++this.monthLoadId;
    this.warning.set(null);
    this.errorMessage.set(null);
    this.controls.set([]);
    this.excludedDates.set(new Set());
    this.excludedDatesBySubject.set(new Map());
    const month = this.month();
    const start = isoFromUtc(month);
    const lastDay = isoFromUtc(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)));
    if (start > this.today) {
      this.controls.set([]);
      this.loadingControls.set(false);
      this.excludedDatesBySubject.set(new Map());
      this.state.set('ready');
      return;
    }
    const end = lastDay > this.today ? this.today : lastDay;
    this.loadingControls.set(true);
    const requests = this.subjects().filter((subject) => !subject.fechaFin || subject.fechaFin >= start);
    if (requests.length === 0) {
      this.controls.set([]);
      this.loadingControls.set(false);
      this.state.set('ready');
      return;
    }
    let failedAttendanceRequest = false;
    forkJoin(requests.map((subject) => {
      const from = start;
      const to = subject.fechaFin && subject.fechaFin < end ? subject.fechaFin : end;
      return forkJoin({
        controls: this.subjectsService.attendanceControls(subject.id, from, to).pipe(
          timeout({ first: 12000 }),
          catchError(() => {
            failedAttendanceRequest = true;
            return of([] as AttendanceControlResponse[]);
          }),
        ),
        excludedDates: this.subjectsService.noClassDates(subject.id, from, to).pipe(
          timeout({ first: 12000 }),
          catchError(() => {
            failedAttendanceRequest = true;
            return of([] as string[]);
          }),
        ),
      });
    })).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        if (loadId === this.monthLoadId) this.loadingControls.set(false);
      }),
    ).subscribe({
      next: (responses) => {
        if (loadId !== this.monthLoadId) return;
        this.controls.set(requests.flatMap((subject, index) =>
          (responses[index]?.controls ?? []).map((control) => ({ subjectId: subject.id, subjectName: subject.nombre, control })),
        ));
        this.excludedDates.set(new Set(responses.flatMap((response) => response?.excludedDates ?? [])));
        this.excludedDatesBySubject.set(new Map(requests.map((subject, index) => [
          subject.id,
          new Set(responses[index]?.excludedDates ?? []),
        ])));
        this.warning.set(failedAttendanceRequest
          ? 'No pudimos cargar algunas asistencias. Los horarios programados siguen visibles.'
          : null);
        this.loadingControls.set(false);
        this.state.set('ready');
      },
      error: () => {
        if (loadId !== this.monthLoadId) return;
        this.controls.set([]);
        this.warning.set('No pudimos cargar las asistencias. Los horarios programados siguen visibles.');
        this.loadingControls.set(false);
        this.state.set('ready');
      },
    });
  }

  private upsertControl(subject: SubjectResponse, control: AttendanceControlResponse): void {
    const current = this.controls().filter((entry) => !(
      entry.control.fecha === control.fecha
      && entry.control.horarioId === control.horarioId
      && entry.control.numero === control.numero
    ));
    this.controls.set([...current, { subjectId: subject.id, subjectName: subject.nombre, control }]);
  }

  private controlKey(control: AttendanceControlResponse): string {
    return `${control.horarioId}-${control.fecha}-${control.numero}`;
  }

  private setControlExpanded(key: string, expanded: boolean): void {
    const next = new Map(this.controlExpansion());
    next.set(key, expanded);
    this.controlExpansion.set(next);
  }

  private pendingControls(fecha: string, schedule: SubjectResponse['horarios'][number]): AttendanceControlResponse[] {
    const startMinutes = this.minutes(schedule.horaInicio);
    const endMinutes = this.minutes(schedule.horaFin);
    const blockCount = schedule.controlesAsistencia;
    return Array.from({ length: blockCount }, (_, index) => {
      const blockStart = startMinutes + ((endMinutes - startMinutes) * index) / blockCount;
      const blockEnd = startMinutes + ((endMinutes - startMinutes) * (index + 1)) / blockCount;
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
  }

  private minutes(value: string): number {
    const [hours = '0', minutes = '0'] = value.split(':');
    return Number(hours) * 60 + Number(minutes);
  }

  private timeString(value: number): string {
    const totalMinutes = Math.round(value);
    return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}:00`;
  }

  private makeVisibleWeekdays(): DiaSemana[] {
    const month = this.month();
    const first = isoFromUtc(month);
    const last = isoFromUtc(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)));
    const inMonthSubjects = this.subjects().filter((subject) => !subject.fechaFin || subject.fechaFin >= first);
    const weekdays: DiaSemana[] = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
    if (inMonthSubjects.some((subject) => subject.horarios.some((schedule) => schedule.diaSemana === 'SABADO'))) weekdays.push('SABADO');
    if (inMonthSubjects.some((subject) => subject.horarios.some((schedule) => schedule.diaSemana === 'DOMINGO'))) weekdays.push('DOMINGO');
    return weekdays;
  }

  private makeWeeks(): CalendarDay[][] {
    const month = this.month();
    const firstDate = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1));
    const mondayOffset = (firstDate.getUTCDay() + 6) % 7;
    const count = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).getUTCDate();
    const columns = this.visibleWeekdays();
    const weekCount = Math.ceil((mondayOffset + count) / 7);
    const selectedIds = this.selectedSubjectIds();
    const rows: CalendarDay[][] = [];
    for (let week = 0; week < weekCount; week++) {
      const row: CalendarDay[] = [];
      for (const weekday of columns) {
        const weekdayOffset = dayByIndex.indexOf(weekday);
        const mondayBasedOffset = (weekdayOffset + 6) % 7;
        const dateValue = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1 - mondayOffset + week * 7 + mondayBasedOffset));
        if (dateValue.getUTCMonth() !== month.getUTCMonth()) {
          row.push({ key: week * columns.length + row.length, date: null, dayNumber: '', scheduled: false, controls: [] });
          continue;
        }
        const date = isoFromUtc(dateValue);
        const weekdayCode = dayByIndex[dateValue.getUTCDay()];
        const dateControls = this.controls().filter((entry) => entry.control.fecha === date && selectedIds.has(entry.subjectId));
        const schedules = this.subjects().filter((subject) =>
          selectedIds.has(subject.id)
          && !this.excludedDatesBySubject().get(subject.id)?.has(date)
          && (!subject.fechaFin || date <= subject.fechaFin),
        ).flatMap((subject) => subject.horarios
          .filter((schedule) => schedule.diaSemana === weekdayCode)
          .map((schedule) => ({ subject, schedule })),
        );
        const scheduledEntries = schedules.flatMap(({ subject, schedule }) => {
          const savedControls = dateControls.filter((entry) =>
            entry.subjectId === subject.id && entry.control.horarioId === schedule.id,
          );
          const controls = savedControls.length > 0
            ? savedControls.map((entry) => entry.control)
            : this.pendingControls(date, schedule);
          return controls.map((control) => ({ subjectId: subject.id, subjectName: subject.nombre, control }));
        });
        const scheduledControlKeys = new Set(scheduledEntries.map((entry) =>
          `${entry.subjectId}-${entry.control.horarioId}-${entry.control.numero}`,
        ));
        const historicalEntries = dateControls.filter((entry) =>
          !scheduledControlKeys.has(`${entry.subjectId}-${entry.control.horarioId}-${entry.control.numero}`),
        );
        row.push({
          key: week * columns.length + row.length,
          date,
          dayNumber: String(dateValue.getUTCDate()),
          scheduled: schedules.length > 0,
          controls: [...scheduledEntries, ...historicalEntries],
        });
      }
      if (row.some((day) => day.date !== null)) rows.push(row);
    }
    return rows;
  }

  private firstMonth(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  }

  private firstWeekdayInMonth(month: Date): string {
    const date = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1));
    while (date.getUTCDay() === 0 || date.getUTCDay() === 6) date.setUTCDate(date.getUTCDate() + 1);
    return isoFromUtc(date);
  }
}
