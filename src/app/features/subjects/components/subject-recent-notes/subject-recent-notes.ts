import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import type { NoteResponse } from '../../models';
import { NotesService } from '../../services/notes.service';

type RecentNotesState = 'loading' | 'error' | 'ready';

@Component({
  selector: 'app-subject-recent-notes',
  imports: [RouterLink],
  templateUrl: './subject-recent-notes.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubjectRecentNotes {
  readonly materiaId = input.required<number>();

  private readonly notesApi = inject(NotesService);
  private readonly destroyRef = inject(DestroyRef);
  private requestVersion = 0;

  readonly state = signal<RecentNotesState>('loading');
  readonly notes = signal<readonly NoteResponse[]>([]);

  constructor() {
    effect(() => this.load(this.materiaId()));
  }

  load(materiaId = this.materiaId()): void {
    const requestVersion = ++this.requestVersion;
    this.state.set('loading');
    this.notes.set([]);
    this.notesApi
      .list(materiaId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (notes) => {
          if (requestVersion !== this.requestVersion) return;
          this.notes.set([...notes].sort((first, second) =>
            Date.parse(second.actualizadoEn) - Date.parse(first.actualizadoEn) || second.id - first.id,
          ).slice(0, 4));
          this.state.set('ready');
        },
        error: () => {
          if (requestVersion === this.requestVersion) this.state.set('error');
        },
      });
  }

  editedAt(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Fecha de edición no disponible';
    return `Editado ${new Intl.DateTimeFormat('es-AR', {
      day: 'numeric', month: 'short', year: 'numeric',
    }).format(date)}`;
  }
}
