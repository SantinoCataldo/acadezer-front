import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { createRequestAction } from '../../../../core/services/request-action';
import { UnsavedChangesService } from '../../../../core/services/unsaved-changes.service';
import {
  CONTENIDO_APUNTE_MAX,
  TITULO_APUNTE_MAX,
  type NoteRequest,
  type NoteResponse,
} from '../../models';
import { NotesService } from '../../services/notes.service';
import { hasContent, validateContentForBackend } from '../../note-text';
import { RichTextEditor } from '../rich-text-editor/rich-text-editor';
import { Modal } from '../modal/modal';
import {
  NotePracticeDialog,
  clearPracticeCache,
} from '../note-practice-dialog/note-practice-dialog';
import { toast } from 'ngx-sonner';
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

function normalizeNoteHtml(html: string): string {
  if (!html) return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return (doc.body.innerHTML || '')
    .replace(/\r\n/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/<br\s*\/?>/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

@Component({
  selector: 'app-note-editor',
  imports: [ReactiveFormsModule, RichTextEditor, Modal, NotePracticeDialog],
  templateUrl: './note-editor.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoteEditor {
  readonly note = input<NoteResponse | null>(null);
  readonly materiaId = input.required<number>();
  readonly materiaNombre = input<string | null>(null);

  readonly saved = output<NoteResponse>();
  readonly deleted = output<void>();
  readonly cancelled = output<void>();

  private readonly notes = inject(NotesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly unsavedChanges = inject(UnsavedChangesService);
  private readonly tituloInput = viewChild<ElementRef<HTMLInputElement>>('tituloInput');

  readonly titulo = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, notBlank, Validators.maxLength(TITULO_APUNTE_MAX)],
  });
  readonly contenido = signal('');
  readonly contentDirty = signal(false);
  readonly contenidoTouched = signal(false);
  readonly confirmingDelete = signal(false);
  readonly confirmingDiscard = signal(false);
  readonly showingInfo = signal(false);
  readonly showingPractice = signal(false);
  readonly exportError = signal<string | null>(null);
  readonly copiedContent = signal(false);

  private readonly tituloValue = toSignal(this.titulo.valueChanges, {
    initialValue: this.titulo.value,
  });

  readonly saveAction = createRequestAction();
  readonly deleteAction = createRequestAction();

  readonly editing = computed(() => this.note() !== null);
  readonly hasContenido = computed(() => hasContent(this.contenido()));
readonly plainTextLength = computed(() => {
    const parsed = new DOMParser().parseFromString(this.contenido(), 'text/html');
    return parsed.body.textContent?.trim().length ?? 0;
  });
  readonly contenidoError = computed(() => {
    if (!this.contenidoTouched()) return null;
    return validateContentForBackend(this.contenido());
  });

  readonly isDirty = computed(() => {
    const current = this.note();
    const currentTitulo = (this.tituloValue() ?? this.titulo.value).trim();
    const currentContenido = this.contenido();

    if (!current) {
      return currentTitulo.length > 0 || hasContent(currentContenido);
    }

    if (!this.titulo.dirty && !this.contentDirty()) {
      return false;
    }

    const titleChanged = currentTitulo !== current.titulo.trim();
    const contentChanged =
      this.contentDirty() &&
      normalizeNoteHtml(currentContenido) !== normalizeNoteHtml(current.contenido);

    return titleChanged || contentChanged;
  });

  readonly tituloMax = TITULO_APUNTE_MAX;
  readonly primaryButtonClass = primaryButton;
  readonly secondaryButtonClass = secondaryButton;
  readonly dangerButtonClass = dangerButton;
  readonly iconButtonClass = iconButton;
  readonly dangerIconButtonClass = dangerIconButton;
  readonly errorSurfaceClass = errorSurface;

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.isDirty()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  constructor() {
    effect(() => {
      this.unsavedChanges.hasPendingChanges.set(this.isDirty());
    });
    this.destroyRef.onDestroy(() => {
      this.unsavedChanges.hasPendingChanges.set(false);
    });

    effect(() => {
      const current = this.note();
      this.titulo.reset(current?.titulo ?? '', { emitEvent: false });
      this.titulo.markAsPristine();
      this.contenido.set(current?.contenido ?? '');
      this.contentDirty.set(false);
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
    this.contentDirty.set(true);
  }

  submit(): void {
    if (this.saveAction.disabled()) return;
    this.contenidoTouched.set(true);
    const contenidoErr = validateContentForBackend(this.contenido());
    if (this.titulo.invalid || contenidoErr) {
      this.titulo.markAsTouched();
      return;
    }

    if (/<img\b[^>]*>/i.test(this.contenido())) {
      toast.error('No se pueden guardar imágenes', {
        description:
          'Los apuntes solo admiten texto con formato. Por favor eliminá la imagen para poder guardar.',
      });
      return;
    }

    if (this.contenido().length > CONTENIDO_APUNTE_MAX) {
      toast.error('El contenido es demasiado extenso', {
        description: `El contenido supera el límite máximo permitido (${this.contenido().length.toLocaleString('es-AR')} de ${CONTENIDO_APUNTE_MAX.toLocaleString('es-AR')} caracteres).`,
      });
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
next: (saved) => {
          this.contentDirty.set(false);
          this.titulo.markAsPristine();
          clearPracticeCache(saved.id);
          toast.success(current ? 'Apunte actualizado' : 'Apunte guardado');
          this.saved.emit(saved);
        },
        error: (err) => {
          console.error('Error guardando apunte:', err);
        },
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
          clearPracticeCache(current.id);
          this.confirmingDelete.set(false);
          toast.success('Apunte eliminado');
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

  openPractice(): void {
    if (!this.editing() || !this.note()) return;

    const parsed = new DOMParser().parseFromString(this.contenido(), 'text/html');
    const plainText = parsed.body.textContent?.trim() ?? '';

    if (plainText.length < 80) {
      toast.error('Apunte demasiado breve para la IA', {
        description: `Tiene ${plainText.length} caracteres y se necesitan al menos 80 para generar preguntas útiles. Escribí un poco más de contenido.`,
      });
      return;
    }

    if (this.isDirty()) {
      toast.warning('Guardá el apunte primero', {
        description: 'Tenés cambios sin guardar. Guardalos para que la IA practique sobre tu versión más reciente.',
      });
      return;
    }

    this.showingPractice.set(true);
  }

  closePractice(): void {
    this.showingPractice.set(false);
  }

  readonly showingDiscardDialog = computed(
    () => this.confirmingDiscard() || this.unsavedChanges.confirmRequested(),
  );

  requestCancel(): void {
    if (this.isDirty()) {
      this.confirmingDiscard.set(true);
      return;
    }
    this.cancelled.emit();
  }

  cancelDiscard(): void {
    this.confirmingDiscard.set(false);
    this.unsavedChanges.resolveConfirmation(false);
  }

  confirmDiscard(): void {
    this.confirmingDiscard.set(false);
    this.unsavedChanges.resolveConfirmation(true);
    this.cancelled.emit();
  }
}
