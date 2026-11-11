import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, AbstractControl, ValidationErrors, Validators } from '@angular/forms';
import { TextField } from '../../../../components/ui/text-field/text-field';
import { createRequestAction } from '../../../../core/services/request-action';
import type { SubjectRequest, SubjectResponse } from '../../models';
import { SubjectsService } from '../../services/subjects.service';
import { Modal } from '../modal/modal';
import { errorSurface, primaryButton, secondaryButton } from '../../dialog-styles';

export const NOMBRE_MAX = 150;
export const DESCRIPCION_MAX = 2000;

function notBlank(control: AbstractControl): ValidationErrors | null {
  return control.value.trim().length === 0 ? { blank: true } : null;
}

/**
 * Diálogo de creación y edición de materia.
 *
 * MAT-01: nombre obligatorio hasta 150 caracteres, descripción opcional hasta
 * 2000. Al guardar emite los datos confirmados por la API; si la operación
 * falla, el diálogo permanece abierto con el mensaje de error.
 */
@Component({
  selector: 'app-subject-form-dialog',
  imports: [ReactiveFormsModule, Modal, TextField],
  templateUrl: './subject-form-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubjectFormDialog {
  /** null crea una materia nueva; con valor, edita la indicada. */
  readonly subject = input.required<SubjectResponse | null>();
  readonly saved = output<SubjectResponse>();
  readonly cancelled = output<void>();

  private readonly subjects = inject(SubjectsService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly action = createRequestAction();
  readonly editing = computed(() => this.subject() !== null);

  // Referencias para la plantilla: los templates solo leen miembros de clase.
  readonly nombreMax = NOMBRE_MAX;
  readonly descripcionMax = DESCRIPCION_MAX;
  readonly primaryButtonClass = primaryButton;
  readonly secondaryButtonClass = secondaryButton;
  readonly errorSurfaceClass = errorSurface;

  readonly form = this.fb.group({
    nombre: ['', [Validators.required, notBlank, Validators.maxLength(NOMBRE_MAX)]],
    descripcion: ['', [Validators.maxLength(DESCRIPCION_MAX)]],
  });

  private prefillDone = false;

  constructor() {
    effect(() => {
      const current = this.subject();
      if (!current || this.prefillDone) return;
      this.prefillDone = true;
      this.form.patchValue({ nombre: current.nombre, descripcion: current.descripcion ?? '' });
      this.form.markAsPristine();
    });
  }

  /**
   * Los mensajes se calculan con métodos y no con `computed`: el estado de un
   * control reactivo (touched, errors, value) no son signals, así que un
   * computed quedaría con el valor en caché y el error no aparecería al
   * enviar el formulario.
   */
  nombreError(): string | null {
    const control = this.form.controls.nombre;
    if (!control.invalid || !(control.touched || control.dirty)) return null;
    if (control.hasError('maxlength')) return `El nombre no puede superar los ${NOMBRE_MAX} caracteres.`;
    return 'El nombre es obligatorio.';
  }

  descripcionLength(): number {
    return this.form.controls.descripcion.value.length;
  }

  descripcionInvalid(): boolean {
    const control = this.form.controls.descripcion;
    return control.invalid && (control.touched || control.dirty);
  }

  descripcionError(): string | null {
    const control = this.form.controls.descripcion;
    if (!this.descripcionInvalid()) return null;
    if (control.hasError('maxlength')) return `La descripción no puede superar los ${DESCRIPCION_MAX} caracteres.`;
    return 'Revisá la descripción.';
  }

  submit(): void {
    if (this.action.disabled()) return;

    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const raw = this.form.getRawValue();
    const nombre = raw.nombre.trim();
    const descripcion = raw.descripcion.trim();
    const request: SubjectRequest = {
      nombre,
      descripcion: descripcion.length > 0 ? descripcion : null,
    };
    const current = this.subject();
    const send = current ? this.subjects.update(current.id, request) : this.subjects.create(request);

    this.action
      .run(() => send)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (saved) => this.saved.emit(saved),
        error: () => undefined,
      });
  }
}
