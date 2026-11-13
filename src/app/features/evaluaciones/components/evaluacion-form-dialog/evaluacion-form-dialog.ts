import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DatePicker } from '../../../../components/ui/date-picker/date-picker';
import { TextField } from '../../../../components/ui/text-field/text-field';
import { Select, type SelectOption } from '../../../../components/ui/select/select';
import { createRequestAction } from '../../../../core/services/request-action';
import type { EvaluacionRequest, EvaluacionResponse } from '../../models';
import {
  ESTADOS_EVALUACION,
  EVALUACION_CALIFICACION_MAX,
  EVALUACION_CALIFICACION_MAX_LENGTH,
  EVALUACION_NOMBRE_MAX_LENGTH,
  NOTA_APROBADA_MIN,
  TIPOS_EVALUACION,
} from '../../models';
import type { EstadoEvaluacion, TipoEvaluacion } from '../../models';
import { EvaluacionService } from '../../evaluacion.service';
import { Modal } from '../../../subjects/components/modal/modal';
import { errorSurface, primaryButton, secondaryButton } from '../../../subjects/dialog-styles';

const NOTA_PATTERN = /^\d+(?:[.,]\d{1,2})?$/;

function currentDateValue(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseNota(raw: string): number | null {
  const text = raw.trim().replace(',', '.');
  if (text.length === 0) return null;
  if (!NOTA_PATTERN.test(text)) return Number.NaN;
  return Number(text);
}

@Component({
  selector: 'app-evaluacion-form-dialog',
  imports: [ReactiveFormsModule, Modal, TextField, DatePicker, Select],
  templateUrl: './evaluacion-form-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvaluacionFormDialog {
  readonly materia = input.required<{ id: number; nombre: string }>();
  readonly evaluacion = input<EvaluacionResponse | null>(null);
  readonly saved = output<EvaluacionResponse>();
  readonly cancelled = output<void>();

  private readonly evaluaciones = inject(EvaluacionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly modal = viewChild.required(Modal);

  readonly action = createRequestAction();
  readonly editing = computed(() => this.evaluacion() !== null);
  readonly tipos = TIPOS_EVALUACION;
  readonly estados = ESTADOS_EVALUACION;
  readonly opcionesTipo: readonly SelectOption<TipoEvaluacion>[] = TIPOS_EVALUACION.map((t) => ({
    value: t.valor,
    label: t.etiqueta,
  }));
  readonly opcionesEstado: readonly SelectOption<EstadoEvaluacion>[] = ESTADOS_EVALUACION.map((e) => ({
    value: e.valor,
    label: e.etiqueta,
  }));
  readonly nombreMax = EVALUACION_NOMBRE_MAX_LENGTH;
  readonly notaMax = EVALUACION_CALIFICACION_MAX;
  readonly notaLength = EVALUACION_CALIFICACION_MAX_LENGTH;

  readonly primaryButtonClass = primaryButton;
  readonly secondaryButtonClass = secondaryButton;
  readonly errorSurfaceClass = errorSurface;

  readonly form = new FormGroup({
    nombre: new FormControl('', { nonNullable: true }),
    fecha: new FormControl(currentDateValue(), { nonNullable: true }),
    tipo: new FormControl<TipoEvaluacion>('PARCIAL_1', { nonNullable: true }),
    estado: new FormControl<EstadoEvaluacion>('PENDIENTE', { nonNullable: true }),
    nota: new FormControl('', { nonNullable: true }),
  });

  readonly pideNota = computed(() => this.form.controls.estado.value !== 'PENDIENTE');
  readonly notaComoNumero = computed(() => parseNota(this.form.controls.nota.value));

  private prefillDone = false;

  constructor() {
    effect(() => {
      const current = this.evaluacion();
      if (!current || this.prefillDone) return;
      this.prefillDone = true;
      this.form.patchValue({
        nombre: current.nombre,
        fecha: current.fecha,
        tipo: current.tipo,
        estado: current.estado,
        nota: current.calificacion === null ? '' : String(current.calificacion),
      });
      this.form.markAsPristine();
    });

    this.form.controls.estado.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((estado) => {
        if (estado === 'PENDIENTE') this.form.controls.nota.setValue('');
      });
  }

  nombreError(): string | null {
    const control = this.form.controls.nombre;
    if (!control.touched && !control.dirty) return null;
    if (control.value.trim().length === 0) return 'El nombre es obligatorio.';
    if (control.value.length > this.nombreMax) {
      return `El nombre no puede superar los ${this.nombreMax} caracteres.`;
    }
    return null;
  }

  fechaError(): string | null {
    const control = this.form.controls.fecha;
    if (!control.touched && !control.dirty) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(control.value)) return 'Elegí una fecha válida.';
    return null;
  }

  notaError(): string | null {
    const control = this.form.controls.nota;
    if (!control.touched && !control.dirty) return null;
    const valor = this.notaComoNumero();
    if (valor === null)
      return this.pideNota() ? 'Cargá la nota o dejá la evaluación pendiente.' : null;
    if (Number.isNaN(valor) || valor < 0 || valor > this.notaMax) {
      return `La nota va de 0 a ${this.notaMax}, con hasta dos decimales.`;
    }
    return null;
  }

  onNotaInput(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    this.form.controls.nota.setValue(target.value);
    const valor = parseNota(target.value);
    if (valor === null || Number.isNaN(valor)) return;
    this.form.controls.estado.setValue(
      valor >= NOTA_APROBADA_MIN ? 'APROBADO' : 'DESAPROBADO',
    );
  }

  close(): void {
    this.modal().requestClose();
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.notaError() || this.nombreError() || this.fechaError()) return;
    if (this.action.disabled()) return;

    const nota = this.notaComoNumero();
    const request: EvaluacionRequest = {
      nombre: this.form.controls.nombre.value.trim(),
      fecha: this.form.controls.fecha.value,
      tipo: this.form.controls.tipo.value,
      estado: this.form.controls.estado.value,
      calificacion: nota === null || Number.isNaN(nota) ? null : nota,
    };

    const current = this.evaluacion();
    const send = current
      ? this.evaluaciones.update(current.id, request)
      : this.evaluaciones.create(this.materia().id, request);

    this.action
      .run(() => send)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (saved) => this.saved.emit(saved),
        error: () => undefined,
      });
  }
}
