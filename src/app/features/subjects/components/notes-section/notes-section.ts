import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
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

function byLastModified(a: NoteResponse, b: NoteResponse): number {
  const left = Date.parse(a.actualizadoEn);
  const right = Date.parse(b.actualizadoEn);
  if (Number.isNaN(left) || Number.isNaN(right)) return b.id - a.id;
  if (left === right) return b.id - a.id;
  return right - left;
}

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
  readonly workspace = input(false);
  readonly workspaceTitle = input<string | null>(null);
  readonly editorOpenChange = output<boolean>();

  private readonly notesApi = inject(NotesService);
  private readonly destroyRef = inject(DestroyRef);

  private loadedMateriaId: number | null = null;
  private requestVersion = 0;

  readonly state = signal<SectionState>('loading');
  readonly notes = signal<readonly NoteResponse[]>([]);
  readonly editing = signal<NoteResponse | null>(null);
  readonly view = signal<'list' | 'editor'>('list');
  readonly errorMessage = signal<string | null>(null);
  readonly count = computed(() => this.notes().length);

  readonly primaryButtonClass = primaryButton;
  readonly secondaryButtonClass = secondaryButton;

  constructor() {
    effect(() => {
      const materiaId = this.materiaId();
      if (this.loadedMateriaId === materiaId) return;
      this.loadedMateriaId = materiaId;
      this.notes.set([]);
      this.editing.set(null);
      this.view.set('list');
      this.editorOpenChange.emit(false);
      this.state.set('loading');
      this.load(materiaId);
    });
  }

  load(materiaId = this.materiaId()): void {
    const requestVersion = ++this.requestVersion;
    if (this.state() !== 'ready') this.state.set('loading');
    this.errorMessage.set(null);
    this.notesApi
      .list(materiaId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (notes) => {
          if (requestVersion !== this.requestVersion) return;
          this.notes.set([...notes].sort(byLastModified));
          this.state.set('ready');
          const current = this.editing();
          if (current && !notes.some((note) => note.id === current.id)) {
            this.editing.set(null);
            this.view.set('list');
          }
        },
        error: (error: unknown) => {
          if (requestVersion !== this.requestVersion) return;
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
    this.editorOpenChange.emit(true);
  }

  createNote(): void {
    this.editing.set(null);
    this.view.set('editor');
    this.editorOpenChange.emit(true);
  }

  backToList(): void {
    this.view.set('list');
    this.editing.set(null);
    this.editorOpenChange.emit(false);
  }

  onSaved(saved: NoteResponse): void {
    this.notes.update((current) =>
      [...current.filter((note) => note.id !== saved.id), saved].sort(byLastModified),
    );
    this.editing.set(saved);
    this.view.set('editor');
    this.editorOpenChange.emit(true);
  }

  onDeleted(): void {
    this.editing.set(null);
    this.view.set('list');
    this.editorOpenChange.emit(false);
    this.load();
  }

  excerpt(note: NoteResponse): string {
    return noteExcerpt(note.contenido);
  }

  lastModified(note: NoteResponse): string {
    return timestamp(note.actualizadoEn);
  }
}
