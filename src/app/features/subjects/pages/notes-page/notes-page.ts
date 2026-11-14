import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NotesSection } from '../../components/notes-section/notes-section';
import type { SubjectResponse } from '../../models';
import { SubjectsService } from '../../services/subjects.service';

type PageState = 'loading' | 'error' | 'ready';

@Component({
  selector: 'app-notes-page',
  imports: [RouterLink, NotesSection],
  templateUrl: './notes-page.html',
  styleUrl: './notes-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotesPage {
  private readonly route = inject(ActivatedRoute);
  private readonly subjectsApi = inject(SubjectsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly subjects = signal<readonly SubjectResponse[]>([]);
  readonly state = signal<PageState>('loading');
  readonly selectedSubjectId = signal<number | null>(null);
  readonly noteEditorOpen = signal(false);
  readonly selectedSubject = computed(
    () => this.subjects().find((subject) => subject.id === this.selectedSubjectId()) ?? null,
  );

  constructor() {
    this.loadSubjects();
  }

  loadSubjects(): void {
    this.state.set('loading');
    this.subjectsApi
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (subjects) => {
          const ordered = [...subjects].sort((first, second) =>
            first.nombre.localeCompare(second.nombre, 'es'),
          );
          this.subjects.set(ordered);
          const requestedId = Number(this.route.snapshot.queryParamMap.get('materiaId'));
          const requestedSubject = ordered.find((subject) => subject.id === requestedId);
          this.selectedSubjectId.set(requestedSubject?.id ?? ordered[0]?.id ?? null);
          this.state.set('ready');
        },
        error: () => this.state.set('error'),
      });
  }

  selectSubject(subject: SubjectResponse): void {
    this.selectedSubjectId.set(subject.id);
  }

  onNoteEditorOpenChange(isOpen: boolean): void {
    this.noteEditorOpen.set(isOpen);
  }
}
