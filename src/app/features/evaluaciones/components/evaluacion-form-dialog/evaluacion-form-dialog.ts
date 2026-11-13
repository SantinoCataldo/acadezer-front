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
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePicker } from '../../../../components/ui/date-picker/date-picker';
import { TextField } from '../../../../components/ui/text-field/text-field';
import { Select, type SelectOption } from '../../../../components/ui/select/select';
import { createRequestAction } from '../../../../core/services/request-action';
import type { EvaluacionRequest, EvaluacionResponse } from '../../models';
import {
  EVALUACION_CALIFICACION_MAX,
  EVALUACION_CALIFICACION_MAX_LENGTH,
  EVALUACION_NOMBRE_MAX_LENGTH,
  NOTA_APROBADA_MIN,
  TIPOS_EVALUACION,
  ESTADOS_EVALUACION,
  type TipoEvaluacion,
  type EstadoEvaluacion,
  computeTipoEstado,
} from '../../models';
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
  readonly materia = input<{ id: number; nombre: string } | null>(null);
  readonly materias = input<readonly { id: number; nombre: string }[]>([]);
  readonly evaluacion = input<EvaluacionResponse | null>(null);
  readonly saved = output<EvaluacionResponse>();
  readonly cancelled = output<void>();

  private readonly evaluaciones = inject(EvaluacionService);
  private readonly modal = viewChild.required(Modal);

  readonly action = createRequestAction();
  readonly editing = computed(() => this.evaluacion() !== null);
  readonly nombreMax = EVALUACION_NOMBRE_MAX_LENGTH;
  readonly notaMax = EVALUACION_CALIFICACION_MAX;
  readonly notaLength = EVALUACION_CALIFICACION_MAX_LENGTH;

  readonly primaryButtonClass = primaryButton;
  readonly secondaryButtonClass = secondaryButton;
  readonly errorSurfaceClass = errorSurface;

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

  readonly opcionesMateria = computed<readonly SelectOption<number>[]>(() => {
    const list = this.materias();
    if (list.length > 0) {
      return list.map((m) => ({ value: m.id, label: m.nombre }));
    }
    const single = this.materia();
    return single ? [{ value: single.id, label: single.nombre }] : [];
  });

  readonly form = new FormGroup({
    materiaId: new FormControl<number | null>(null),
    nombre: new FormControl('', { nonNullable: true }),
    fecha: new FormControl(currentDateValue(), { nonNullable: true }),
    tipo: new FormControl<TipoEvaluacion>('PARCIAL_1', { nonNullable: true }),
    estado: new FormControl<EstadoEvaluacion>('PENDIENTE', { nonNullable: true }),
    nota: new FormControl('', { nonNullable: true }),
  });

  private readonly notaValue = toSignal(this.form.controls.nota.valueChanges, {
    initialValue: this.form.controls.nota.value,
  });
  readonly notaComoNumero = computed(() => parseNota(this.notaValue()));

  private prefillDone = false;

  constructor() {
    effect(() => {
      const single = this.materia();
      const list = this.materias();
      if (!this.form.controls.materiaId.value) {
        if (single) {
          this.form.controls.materiaId.setValue(single.id);
        } else if (list.length > 0) {
          this.form.controls.materiaId.setValue(list[0].id);
        }
      }
    });

    effect(() => {
      const current = this.evaluacion();
      if (!current || this.prefillDone) return;
      this.prefillDone = true;
      this.form.patchValue({
        materiaId: current.materiaId,
        nombre: current.nombre,
        fecha: current.fecha,
        tipo: current.tipo ?? 'PARCIAL_1',
        estado: current.estado ?? 'PENDIENTE',
        nota: current.calificacion === null ? '' : String(current.calificacion),
      });
      this.form.markAsPristine();
    });

    this.form.controls.nota.valueChanges.subscribe((notaRaw) => {
      const valor = parseNota(notaRaw);
      if (valor === null || Number.isNaN(valor)) {
        this.form.controls.estado.setValue('PENDIENTE');
      } else {
        const expectedEstado = valor >= NOTA_APROBADA_MIN ? 'APROBADO' : 'DESAPROBADO';
        const currentEstado = this.form.controls.estado.value;
        if (currentEstado !== 'PENDIENTE' && currentEstado !== expectedEstado) {
          this.form.controls.estado.setValue(expectedEstado, { emitEvent: false });
        }
      }
    });

    this.form.controls.estado.valueChanges.subscribe((estado) => {
      if (estado === 'PENDIENTE') {
        this.form.controls.nota.setValue('');
      } else {
        const notaRaw = this.form.controls.nota.value;
        const valor = parseNota(notaRaw);
        if (valor !== null && !Number.isNaN(valor)) {
          const expectedEstado = valor >= NOTA_APROBADA_MIN ? 'APROBADO' : 'DESAPROBADO';
          if (estado !== expectedEstado) {
            this.form.controls.estado.setValue(expectedEstado, { emitEvent: false });
          }
        }
      }
    });
  }

  nombreMateriaActual(): string {
    const id = this.form.controls.materiaId.value ?? this.materia()?.id;
    if (!id) return this.materia()?.nombre ?? 'Materia';
    return this.materias().find((m) => m.id === id)?.nombre ?? this.materia()?.nombre ?? 'Materia';
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
    const raw = control.value.trim();
    if (raw.length === 0) return null;
    const valor = parseNota(raw);
    if (valor === null || Number.isNaN(valor) || valor < 0 || valor > this.notaMax) {
      return `La nota va de 0 a ${this.notaMax}, con hasta dos decimales.`;
    }
    return null;
  }

  close(): void {
    this.modal().requestClose();
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.nombreError() || this.fechaError() || this.notaError()) return;
    if (this.action.disabled()) return;

    const targetMateriaId = this.form.controls.materiaId.value ?? this.materia()?.id ?? this.materias()[0]?.id;
    if (!targetMateriaId) return;

    const nota = parseNota(this.form.controls.nota.value);
    const notaNum = nota === null || Number.isNaN(nota) ? null : nota;
    const estado = notaNum === null ? 'PENDIENTE' : (notaNum >= NOTA_APROBADA_MIN ? 'APROBADO' : 'DESAPROBADO');
    const request: EvaluacionRequest = {
      nombre: this.form.controls.nombre.value.trim(),
      fecha: this.form.controls.fecha.value,
      tipo: this.form.controls.tipo.value,
      estado,
      calificacion: notaNum,
    };

    const current = this.evaluacion();
    const send = current
      ? this.evaluaciones.update(current.id, request)
      : this.evaluaciones.create(targetMateriaId, request);

    this.action
      .run(() => send)
      .subscribe({
        next: (saved) => this.saved.emit(saved),
        error: (err) => {
          console.error('Error guardando evaluación:', err);
        },
      });
  }
}
