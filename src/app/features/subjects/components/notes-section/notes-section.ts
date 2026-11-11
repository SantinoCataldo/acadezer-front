import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { NotesService } from '../../services/notes.service';
import { noteExcerpt } from '../../note-text';
import type { NoteResponse } from '../../models';
import { NoteEditor } from '../note-editor/note-editor';
import { primaryButton, secondaryButton } from '../../dialog-styles';

type SectionState = 'loading' | 'error' | 'ready';

function responseErrorMessage(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse)) return null;
  const body: unknown = error.error;
  if (typeof body !== 'object' || body === null || !('message' in body)) return null;
  return typeof body.message === 'string' && body.message.trim() ? body.message : null;
}

function timestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** Orden de la lista: el apunte editido más reciente arriba. */
function byLastModified(a: NoteResponse, b: NoteResponse): number {
  const left = Date.parse(a.actualizadoEn);
  const right = Date.parse(b.actualizadoEn);
  if (Number.isNaN(left) || Number.isNaN(right)) return b.id - a.id;
  if (left === right) return b.id - a.id;
  return right - left;
}

/**
 * APU-01/APU-03: sección Apuntes dentro del detalle de materia.
 *
 * Lista los apuntes de ESA materia (el backend ya filtra por materia y por
 * dueño) y abre el editor para crear, editar o eliminar. En pantallas anchas se
 * ven lista y editor a la par; en celular se navega de uno al otro.
 */
@Component({
  selector: 'app-notes-section',
  imports: [NoteEditor],
  templateUrl: './notes-section.html',
  styleUrl: './notes-section.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class NotesSection {
  readonly materiaId = input.required<number>();

  private readonly notesApi = inject(NotesService);
  private readonly destroyRef = inject(DestroyRef);

  /** Materia cuya lista ya se pidió: ver el comentario del constructor. */
  private loadedMateriaId: number | null = null;

  readonly state = signal<SectionState>('loading');
  readonly notes = signal<readonly NoteResponse[]>([]);
  readonly editing = signal<NoteResponse | null>(null);
  readonly view = signal<'list' | 'editor'>('list');
  readonly errorMessage = signal<string | null>(null);
  readonly count = computed(() => this.notes().length);

  // Referencias para la plantilla.
  readonly primaryButtonClass = primaryButton;
  readonly secondaryButtonClass = secondaryButton;

  constructor() {
    // Angular vuelve a ejecutar el efecto cuando termina la tarea pendiente que
    // él mismo abrió (el pedido de la lista), así que con este centinela se pide
    // una sola vez por materia y no se pisa el estado de error o de carga.
    effect(() => {
      const materiaId = this.materiaId();
      if (this.loadedMateriaId === materiaId) return;
      this.loadedMateriaId = materiaId;
      this.load(materiaId);
    });
  }

  load(materiaId = this.materiaId()): void {
    if (this.state() !== 'ready') this.state.set('loading');
    this.errorMessage.set(null);
    this.notesApi
      .list(materiaId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (notes) => {
          this.notes.set([...notes].sort(byLastModified));
          this.state.set('ready');
          // Si el apunte abierto dejó de existir, se vuelve a la lista.
          const current = this.editing();
          if (current && !notes.some((note) => note.id === current.id)) {
            this.editing.set(null);
            this.view.set('list');
          }
        },
        error: (error: unknown) => {
          this.state.set('error');
          this.errorMessage.set(
            responseErrorMessage(error) ?? 'No pudimos cargar los apuntes. Intentá de nuevo.',
          );
        },
      });
  }

  openNote(note: NoteResponse): void {
    this.editing.set(note);
    this.view.set('editor');
  }

  createNote(): void {
    this.editing.set(null);
    this.view.set('editor');
  }

  backToList(): void {
    this.view.set('list');
    this.editing.set(null);
  }

  onSaved(saved: NoteResponse): void {
    // Guardar cierra el editor y vuelve a la lista: el apunte queda arriba como
    // el más reciente, así se ve el resultado sin pasos extra.
    this.notes.update((current) =>
      [...current.filter((note) => note.id !== saved.id), saved].sort(byLastModified),
    );
    this.editing.set(null);
    this.view.set('list');
  }

  onDeleted(): void {
    this.editing.set(null);
    this.view.set('list');
    this.load();
  }

  excerpt(note: NoteResponse): string {
    return noteExcerpt(note.contenido);
  }

  lastModified(note: NoteResponse): string {
    return timestamp(note.actualizadoEn);
  }
}
