import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { createRequestAction } from '../../../../core/services/request-action';
import {
  CONTENIDO_APUNTE_MAX,
  TITULO_APUNTE_MAX,
  type NoteRequest,
  type NoteResponse,
} from '../../models';
import { NotesService } from '../../services/notes.service';
import { hasContent } from '../../note-text';
import { RichTextEditor } from '../rich-text-editor/rich-text-editor';
import { Modal } from '../modal/modal';
import {
  dangerButton,
  errorSurface,
  iconButton,
  primaryButton,
  secondaryButton,
} from '../../dialog-styles';

function notBlank(control: AbstractControl): { blank: true } | null {
  return (control.value as string).trim().length === 0 ? { blank: true } : null;
}

function timestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * APU-03: panel de edición de un apunte.
 *
 * Abre un apunte existente o uno nuevo: título de una línea, editor de
 * contenido enriquecido y acciones de guardar, cancelar y eliminar. El envío y
 * la confirmación de borrado viven acá para no dejar la pantalla a medias; el
 * candidato solo informa el resultado al contenedor.
 */
@Component({
  selector: 'app-note-editor',
  imports: [ReactiveFormsModule, RichTextEditor, Modal],
  templateUrl: './note-editor.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoteEditor {
  /** null crea un apunte nuevo. */
  readonly note = input<NoteResponse | null>(null);
  readonly materiaId = input.required<number>();

  readonly saved = output<NoteResponse>();
  readonly deleted = output<void>();
  readonly cancelled = output<void>();

  private readonly notes = inject(NotesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly tituloInput = viewChild<ElementRef<HTMLInputElement>>('titulo');

  readonly titulo = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, notBlank, Validators.maxLength(TITULO_APUNTE_MAX)],
  });
  readonly contenido = signal('');
  readonly contenidoTouched = signal(false);
  readonly confirmingDelete = signal(false);

  readonly saveAction = createRequestAction();
  readonly deleteAction = createRequestAction();

  readonly editing = computed(() => this.note() !== null);
  readonly contenidoError = computed(() =>
    this.contenidoTouched() && !hasContent(this.contenido())
      ? 'El contenido no puede quedar vacío.'
      : null,
  );
  readonly statusText = computed(() => {
    const current = this.note();
    if (!current) return 'Apunte sin guardar';
    return `Editado el ${timestamp(current.actualizadoEn)}`;
  });

  readonly tituloMax = TITULO_APUNTE_MAX;
  readonly contenidoMax = CONTENIDO_APUNTE_MAX;
  // Referencias para la plantilla.
  readonly primaryButtonClass = primaryButton;
  readonly secondaryButtonClass = secondaryButton;
  readonly dangerButtonClass = dangerButton;
  readonly iconButtonClass = iconButton;
  readonly errorSurfaceClass = errorSurface;

  constructor() {
    // El candidato entra por `note`: al cambiar de apunte se recargan los campos
    // sin reescribir lo que el usuario está escribiendo.
    effect(() => {
      const current = this.note();
      this.titulo.reset(current?.titulo ?? '');
      this.contenido.set(current?.contenido ?? '');
      this.contenidoTouched.set(false);
      if (!current) queueMicrotask(() => this.tituloInput()?.nativeElement.focus());
    });
  }

  tituloError(): string | null {
    const control = this.titulo;
    if (!control.invalid || !(control.touched || control.dirty)) return null;
    if (control.hasError('maxlength'))
      return `El título no puede superar los ${TITULO_APUNTE_MAX} caracteres.`;
    return 'Escribí un título para el apunte.';
  }

  onContenido(html: string): void {
    this.contenido.set(html);
    this.contenidoTouched.set(true);
  }

  submit(): void {
    if (this.saveAction.disabled()) return;
    this.contenidoTouched.set(true);
    if (this.titulo.invalid || !hasContent(this.contenido())) {
      this.titulo.markAsTouched();
      return;
    }

    const request: NoteRequest = { titulo: this.titulo.value.trim(), contenido: this.contenido() };
    const current = this.note();
    const send = current
      ? this.notes.update(current.id, request)
      : this.notes.create(this.materiaId(), request);

    this.saveAction
      .run(() => send)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (saved) => this.saved.emit(saved),
        error: () => undefined,
      });
  }

  requestDelete(): void {
    this.confirmingDelete.set(true);
  }

  closeDeleteConfirmation(): void {
    this.confirmingDelete.set(false);
  }

  confirmDelete(): void {
    const current = this.note();
    if (!current || this.deleteAction.disabled()) return;

    this.deleteAction
      .run(() => this.notes.delete(current.id))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.confirmingDelete.set(false);
          this.deleted.emit();
        },
        error: () => undefined,
      });
  }

  formatDate(value: string): string {
    return timestamp(value);
  }
}
