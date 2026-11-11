import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, ElementRef, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, AbstractControl, ValidationErrors, Validators } from '@angular/forms';
import { gsap } from 'gsap';
import { TextField } from '../../../../components/ui/text-field/text-field';
import { createRequestAction } from '../../../../core/services/request-action';
import type { DiaSemana, HorarioRequest, HorarioResponse, SubjectRequest, SubjectResponse } from '../../models';
import { SubjectsService } from '../../services/subjects.service';
import { Modal } from '../modal/modal';
import { errorSurface, primaryButton, secondaryButton } from '../../dialog-styles';

export const NOMBRE_MAX = 150;

interface ScheduleControls {
  id: FormControl<number | null>;
  diaSemana: FormControl<DiaSemana>;
  horaInicio: FormControl<string>;
  horaFin: FormControl<string>;
  controlesAsistencia: FormControl<1 | 2>;
}

type ScheduleForm = FormGroup<ScheduleControls>;

const WEEKDAYS: readonly { value: DiaSemana; label: string }[] = [
  { value: 'LUNES', label: 'Lunes' },
  { value: 'MARTES', label: 'Martes' },
  { value: 'MIERCOLES', label: 'Miércoles' },
  { value: 'JUEVES', label: 'Jueves' },
  { value: 'VIERNES', label: 'Viernes' },
  { value: 'SABADO', label: 'Sábado' },
  { value: 'DOMINGO', label: 'Domingo' },
];

function currentDateValue(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function timeRangeValidator(control: AbstractControl): ValidationErrors | null {
  const start = control.get('horaInicio')?.value as string | undefined;
  const end = control.get('horaFin')?.value as string | undefined;
  return start && end && start >= end ? { invalidTimeRange: true } : null;
}

function notBlank(control: AbstractControl): ValidationErrors | null {
  return control.value.trim().length === 0 ? { blank: true } : null;
}

function uniqueWeekdayValidator(control: AbstractControl): ValidationErrors | null {
  const schedules = control as FormArray<ScheduleForm>;
  const days = schedules.controls.map((schedule) => schedule.controls.diaSemana.value);
  return new Set(days).size === days.length ? null : { duplicateWeekday: true };
}

function createSchedule(schedule?: Partial<HorarioResponse>): ScheduleForm {
  return new FormGroup<ScheduleControls>(
    {
      id: new FormControl<number | null>(schedule?.id ?? null),
      diaSemana: new FormControl<DiaSemana>(schedule?.diaSemana ?? 'LUNES', { nonNullable: true, validators: [Validators.required] }),
      horaInicio: new FormControl(schedule?.horaInicio ?? '08:00', { nonNullable: true, validators: [Validators.required] }),
      horaFin: new FormControl(schedule?.horaFin ?? '10:00', { nonNullable: true, validators: [Validators.required] }),
      controlesAsistencia: new FormControl<1 | 2>(schedule?.controlesAsistencia ?? 1, { nonNullable: true }),
    },
    { validators: [timeRangeValidator] },
  );
}

@Component({
  selector: 'app-subject-form-dialog',
  imports: [ReactiveFormsModule, Modal, TextField],
  templateUrl: './subject-form-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubjectFormDialog {
  readonly subject = input.required<SubjectResponse | null>();
  readonly saved = output<SubjectResponse>();
  readonly cancelled = output<void>();

  private readonly subjects = inject(SubjectsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly modal = viewChild.required(Modal);
  private readonly scheduleList = viewChild<ElementRef<HTMLElement>>('scheduleList');
  readonly animatingDays = signal<ReadonlySet<DiaSemana>>(new Set());

  readonly action = createRequestAction();
  readonly editing = computed(() => this.subject() !== null);
  readonly weekdays = WEEKDAYS;
  readonly primaryButtonClass = primaryButton;
  readonly secondaryButtonClass = secondaryButton;
  readonly errorSurfaceClass = errorSurface;
  readonly nombreMax = NOMBRE_MAX;

  readonly schedules = new FormArray<ScheduleForm>([], [Validators.minLength(1), uniqueWeekdayValidator]);
  readonly form = new FormGroup({
    nombre: new FormControl('', { nonNullable: true, validators: [Validators.required, notBlank, Validators.maxLength(NOMBRE_MAX)] }),
    horarios: this.schedules,
  });

  private prefillDone = false;

  constructor() {
    this.destroyRef.onDestroy(() => gsap.killTweensOf(this.scheduleCards()));
    effect(() => {
      const current = this.subject();
      if (!current || this.prefillDone) return;
      this.prefillDone = true;
      this.form.patchValue({
        nombre: current.nombre,
      });
      for (const schedule of current.horarios ?? []) this.schedules.push(createSchedule(schedule));
      this.form.markAsPristine();
    });
  }

  nombreError(): string | null {
    const control = this.form.controls.nombre;
    if (!control.invalid || !(control.touched || control.dirty)) return null;
    if (control.hasError('maxlength')) return `El nombre no puede superar los ${NOMBRE_MAX} caracteres.`;
    return 'El nombre es obligatorio.';
  }

  scheduleError(index: number): string | null {
    const schedule = this.schedules.at(index);
    if (!schedule.touched && !schedule.dirty) return null;
    if (schedule.hasError('invalidTimeRange')) return 'El horario de fin debe ser posterior al de inicio.';
    return null;
  }

  isDaySelected(day: DiaSemana): boolean {
    return this.schedules.controls.some((schedule) => schedule.controls.diaSemana.value === day);
  }

  isDayAnimating(day: DiaSemana): boolean {
    return this.animatingDays().has(day);
  }

  toggleScheduleDay(day: DiaSemana): void {
    if (this.isDayAnimating(day)) return;
    const existingIndex = this.schedules.controls.findIndex((schedule) => schedule.controls.diaSemana.value === day);
    if (existingIndex >= 0) {
      this.removeSchedule(existingIndex);
      return;
    }

    const previousPositions = this.schedulePositions();
    this.schedules.push(
      createSchedule({
        diaSemana: day,
        horaInicio: '08:00',
        horaFin: '10:00',
        controlesAsistencia: 1,
      }),
    );
    requestAnimationFrame(() => {
      if (!this.destroyRef.destroyed) this.animateScheduleAddition(day, previousPositions);
    });
  }

  dayLabel(day: DiaSemana): string {
    return WEEKDAYS.find((item) => item.value === day)?.label ?? day;
  }

  scheduleDayClass(day: DiaSemana): string {
    const base = 'min-h-11 min-w-11 cursor-pointer rounded-full px-3 text-sm font-semibold transition-[background-color,color,transform] duration-150 hover:scale-[0.99] active:scale-[1.01] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent-content)] motion-reduce:transition-none';
    return this.isDaySelected(day)
      ? `${base} bg-[var(--theme-accent)] text-[var(--theme-on-accent)]`
      : `${base} bg-[var(--theme-surface-high)] text-[var(--theme-foreground)] hover:bg-[var(--theme-surface)]`;
  }

  removeSchedule(index: number): void {
    const schedule = this.schedules.at(index);
    if (!schedule) return;
    const day = schedule.controls.diaSemana.value;
    const card = this.scheduleCard(day);
    if (!card || this.prefersReducedMotion()) {
      this.schedules.removeAt(index);
      return;
    }

    this.animatingDays.update((days) => new Set(days).add(day));
    gsap.to(card, {
      height: 0,
      marginTop: 0,
      paddingTop: 0,
      paddingBottom: 0,
      opacity: 0,
      y: -6,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        if (this.destroyRef.destroyed) return;
        const previousPositions = this.schedulePositions();
        const currentIndex = this.schedules.controls.findIndex((item) => item.controls.diaSemana.value === day);
        if (currentIndex >= 0) this.schedules.removeAt(currentIndex);
        this.changeDetector.detectChanges();
        requestAnimationFrame(() => {
          if (this.destroyRef.destroyed) return;
          const currentCards = this.scheduleCards();
          for (const currentCard of currentCards) {
            const previousTop = previousPositions.get(currentCard.dataset['scheduleDay'] ?? '');
            if (previousTop === undefined) continue;
            const offset = previousTop - currentCard.getBoundingClientRect().top;
            if (Math.abs(offset) < 1) continue;
            gsap.fromTo(currentCard, { y: offset }, { y: 0, duration: 0.22, ease: 'power2.out', clearProps: 'transform' });
          }
          this.animatingDays.update((days) => {
            const next = new Set(days);
            next.delete(day);
            return next;
          });
        });
      },
    });
  }

  private animateScheduleAddition(day: DiaSemana, previousPositions: Map<string, number>): void {
    const cards = this.scheduleCards();
    for (const card of cards) {
      const key = card.dataset['scheduleDay'] ?? '';
      if (key === day) {
        if (this.prefersReducedMotion()) continue;
        gsap.fromTo(
          card,
          { autoAlpha: 0, y: 8, scale: 0.985, filter: 'blur(4px)' },
          { autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.24, ease: 'power2.out', clearProps: 'filter,transform,opacity,visibility' },
        );
        continue;
      }

      const previousTop = previousPositions.get(key);
      if (previousTop === undefined || this.prefersReducedMotion()) continue;
      const offset = previousTop - card.getBoundingClientRect().top;
      if (Math.abs(offset) >= 1) {
        gsap.fromTo(card, { y: offset }, { y: 0, duration: 0.24, ease: 'power2.out', clearProps: 'transform' });
      }
    }
  }

  private schedulePositions(): Map<string, number> {
    return new Map(this.scheduleCards().map((card) => [card.dataset['scheduleDay'] ?? '', card.getBoundingClientRect().top]));
  }

  private scheduleCards(): HTMLElement[] {
    return Array.from(this.scheduleList()?.nativeElement.querySelectorAll<HTMLElement>('[data-schedule-day]') ?? []);
  }

  private scheduleCard(day: DiaSemana): HTMLElement | undefined {
    return this.scheduleCards().find((card) => card.dataset['scheduleDay'] === day);
  }

  private prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  setAttendanceChecks(schedule: ScheduleForm, controls: 1 | 2): void {
    schedule.controls.controlesAsistencia.setValue(controls);
  }

  submit(): void {
    if (this.action.disabled()) return;

    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const raw = this.form.getRawValue();
    const horarios: HorarioRequest[] = raw.horarios.map((schedule) => {
      const { id, ...data } = schedule;
      return id === null ? data : { id, ...data };
    });
    const current = this.subject();
    const request: SubjectRequest = {
      nombre: raw.nombre.trim(),
      fechaInicio: current?.fechaInicio ?? currentDateValue(),
      fechaFin: current?.fechaFin ?? null,
      horarios,
    };
    const send = current ? this.subjects.update(current.id, request) : this.subjects.create(request);

    this.action
      .run(() => send)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (saved) => this.saved.emit(saved),
        error: () => undefined,
      });
  }

  close(): void {
    this.modal().requestClose();
  }
}
