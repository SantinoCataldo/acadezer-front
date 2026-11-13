import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { gsap } from 'gsap';
import { toast } from 'ngx-sonner';
import { Modal } from '../modal/modal';
import { NotesService } from '../../services/notes.service';
import type { PracticeQuestion } from '../../models';

const PRACTICE_CACHE_PREFIX = 'acadezer_practice_';

export function getCachedQuestions(noteId: number): PracticeQuestion[] | null {
  try {
    const raw = sessionStorage.getItem(`${PRACTICE_CACHE_PREFIX}${noteId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as PracticeQuestion[];
    }
    return null;
  } catch {
    return null;
  }
}

export function setCachedQuestions(noteId: number, questions: readonly PracticeQuestion[]): void {
  try {
    sessionStorage.setItem(`${PRACTICE_CACHE_PREFIX}${noteId}`, JSON.stringify(questions));
  } catch {
    // sessionStorage quota or security restrictions
  }
}

export function clearPracticeCache(noteId: number): void {
  try {
    sessionStorage.removeItem(`${PRACTICE_CACHE_PREFIX}${noteId}`);
  } catch {
    // ignore
  }
}

@Component({
  selector: 'app-note-practice-dialog',
  imports: [Modal],
  templateUrl: './note-practice-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotePracticeDialog implements OnInit {
  readonly noteId = input.required<number>();
  readonly noteTitle = input<string>('Apunte');
  readonly closed = output<void>();

  private readonly notes = inject(NotesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly cardArticle = viewChild<ElementRef<HTMLElement>>('cardArticle');

  readonly status = signal<'loading' | 'ready' | 'error' | 'insufficient'>('loading');
  readonly errorMessage = signal<string>('');
  readonly questions = signal<readonly PracticeQuestion[]>([]);
  readonly currentIndex = signal<number>(0);
  readonly revealedAnswers = signal<ReadonlySet<number>>(new Set());
  readonly viewMode = signal<'card' | 'list'>('card');

  constructor() {
    this.destroyRef.onDestroy(() => {
      const card = this.cardArticle()?.nativeElement;
      if (card) gsap.killTweensOf(card);
    });
  }

  readonly currentQuestion = computed(() => {
    const list = this.questions();
    const idx = this.currentIndex();
    return list[idx] ?? null;
  });

  readonly isCurrentRevealed = computed(() => {
    return this.revealedAnswers().has(this.currentIndex());
  });

  ngOnInit(): void {
    const cached = getCachedQuestions(this.noteId());
    if (cached && cached.length > 0) {
      this.questions.set(cached);
      this.status.set('ready');
      return;
    }
    this.generateQuestions();
  }

  regenerateQuestions(): void {
    clearPracticeCache(this.noteId());
    this.generateQuestions();
  }

  generateQuestions(): void {
    this.status.set('loading');
    this.errorMessage.set('');
    this.revealedAnswers.set(new Set());
    this.currentIndex.set(0);

    this.notes
      .generatePracticeQuestions(this.noteId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.questions.set(res.preguntas);
          setCachedQuestions(this.noteId(), res.preguntas);
          this.status.set('ready');
        },
        error: (err: unknown) => {
          if (err instanceof HttpErrorResponse) {
            if (err.status === 422) {
              const msg =
                'El apunte es demasiado breve. Necesita al menos 80 caracteres de contenido para que la IA formule preguntas de estudio útiles.';
              this.status.set('insufficient');
              this.errorMessage.set(msg);
              toast.error(msg);
              return;
            }
            if (err.status === 429) {
              const msg =
                'Alcanzaste el límite de consultas de IA por hora (20 consultas / hora). Esperá unos minutos antes de volver a intentar.';
              this.status.set('error');
              this.errorMessage.set(msg);
              toast.error(msg);
              return;
            }
            if (err.status === 503) {
              const msg = 'La función de IA no está configurada o disponible en el servidor.';
              this.status.set('error');
              this.errorMessage.set(msg);
              toast.error(msg);
              return;
            }
          }
          const generic = 'No pudimos generar las preguntas con IA. Por favor, intentá nuevamente.';
          this.status.set('error');
          this.errorMessage.set(generic);
          toast.error(generic);
        },
      });
  }

  private animateCardHeight(mutate: () => void): void {
    const card = this.cardArticle()?.nativeElement;
    if (!card) {
      mutate();
      return;
    }

    gsap.killTweensOf(card);
    const initialHeight = card.getBoundingClientRect().height;

    mutate();
    this.changeDetector.detectChanges();

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(card, { clearProps: 'height,overflow' });
      return;
    }

    gsap.set(card, { clearProps: 'height,overflow' });
    const targetHeight = card.getBoundingClientRect().height;

    if (Math.abs(targetHeight - initialHeight) < 2) {
      return;
    }

    gsap.fromTo(
      card,
      { height: initialHeight, overflow: 'hidden' },
      {
        height: targetHeight,
        duration: 0.28,
        ease: 'power2.out',
        onComplete: () => {
          gsap.set(card, { clearProps: 'height,overflow' });
        },
      },
    );
  }

  toggleReveal(index = this.currentIndex()): void {
    if (this.viewMode() === 'card') {
      this.animateCardHeight(() => {
        this.performToggleReveal(index);
      });
    } else {
      this.performToggleReveal(index);
    }
  }

  private performToggleReveal(index: number): void {
    this.revealedAnswers.update((current) => {
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  isRevealed(index: number): boolean {
    return this.revealedAnswers().has(index);
  }

  goToQuestion(index: number): void {
    if (index >= 0 && index < this.questions().length && index !== this.currentIndex()) {
      if (this.viewMode() === 'card') {
        this.animateCardHeight(() => {
          this.currentIndex.set(index);
        });
      } else {
        this.currentIndex.set(index);
      }
    }
  }

  nextQuestion(): void {
    if (this.currentIndex() < this.questions().length - 1) {
      this.goToQuestion(this.currentIndex() + 1);
    }
  }

  prevQuestion(): void {
    if (this.currentIndex() > 0) {
      this.goToQuestion(this.currentIndex() - 1);
    }
  }

  toggleViewMode(): void {
    this.viewMode.update((mode) => (mode === 'card' ? 'list' : 'card'));
  }
}

