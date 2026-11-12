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
  dangerIconButton,
  errorSurface,
  iconButton,
  primaryButton,
  secondaryButton,
} from '../../dialog-styles';

function notBlank(control: AbstractControl): { blank: true } | null {
  return (control.value as string).trim().length === 0 ? { blank: true } : null;
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
  readonly materiaNombre = input<string | null>(null);

  readonly saved = output<NoteResponse>();
  readonly deleted = output<void>();
  readonly cancelled = output<void>();

  private readonly notes = inject(NotesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly tituloInput = viewChild<ElementRef<HTMLInputElement>>('tituloInput');

  readonly titulo = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, notBlank, Validators.maxLength(TITULO_APUNTE_MAX)],
  });
  readonly contenido = signal('');
  readonly contenidoTouched = signal(false);
  readonly confirmingDelete = signal(false);
  readonly showingInfo = signal(false);
  readonly exportError = signal<string | null>(null);
  readonly copiedContent = signal(false);

  readonly saveAction = createRequestAction();
  readonly deleteAction = createRequestAction();

  readonly editing = computed(() => this.note() !== null);
  readonly hasContenido = computed(() => hasContent(this.contenido()));
  readonly contenidoError = computed(() =>
    this.contenidoTouched() && !hasContent(this.contenido())
      ? 'El contenido no puede quedar vacío.'
      : null,
  );

  readonly tituloMax = TITULO_APUNTE_MAX;
  // Referencias para la plantilla.
  readonly primaryButtonClass = primaryButton;
  readonly secondaryButtonClass = secondaryButton;
  readonly dangerButtonClass = dangerButton;
  readonly iconButtonClass = iconButton;
  readonly dangerIconButtonClass = dangerIconButton;
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

  downloadPdf(): void {
    this.exportError.set(null);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.exportError.set('Permití las ventanas emergentes para exportar el apunte.');
      return;
    }
    printWindow.opener = null;

    const title = this.titulo.value.trim() || 'Apunte sin título';
    const safeTitle = this.escapeHtml(title);
    const safeContent = this.sanitizeForPrint(this.contenido());
    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>${safeTitle}</title>
          <style>
            body { max-width: 760px; margin: 48px auto; padding: 0 28px; color: #171717; font: 16px/1.65 Arial, sans-serif; }
            h1 { margin: 0 0 28px; font-size: 30px; line-height: 1.2; }
            img { max-width: 100%; }
            blockquote { margin: 20px 0; padding-left: 16px; border-left: 3px solid #777; color: #444; }
            @media print { body { margin: 0 auto; } }
          </style>
        </head>
        <body><main><h1>${safeTitle}</h1>${safeContent}</main></body>
      </html>`);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => printWindow.print(), 250);
  }

  async copyContent(): Promise<void> {
    this.exportError.set(null);
    const parsed = new DOMParser().parseFromString(this.contenido(), 'text/html');
    const text = parsed.body.textContent?.trim() ?? '';
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      this.copiedContent.set(true);
      window.setTimeout(() => this.copiedContent.set(false), 1400);
    } catch {
      this.exportError.set('No se pudo copiar el contenido del apunte.');
    }
  }

  metadataDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  private sanitizeForPrint(html: string): string {
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const allowed = new Set([
      'P',
      'BR',
      'STRONG',
      'B',
      'EM',
      'I',
      'U',
      'S',
      'UL',
      'OL',
      'LI',
      'H1',
      'H2',
      'BLOCKQUOTE',
    ]);
    const clean = (node: ParentNode): void => {
      for (const child of Array.from(node.childNodes)) {
        if (!(child instanceof HTMLElement)) continue;
        clean(child);
        if (!allowed.has(child.tagName)) {
          child.replaceWith(...Array.from(child.childNodes));
          continue;
        }
        for (const attribute of Array.from(child.attributes)) child.removeAttribute(attribute.name);
      }
    };
    clean(parsed.body);
    return parsed.body.innerHTML;
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };
      return entities[character] ?? character;
    });
  }
}
