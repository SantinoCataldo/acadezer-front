import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { gsap } from 'gsap';
import { authAppearance } from '@features/auth/auth-theme';

interface StudyStep {
  key: string;
  label: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-auth-hero',
  imports: [],
  templateUrl: './auth-hero.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthHero implements AfterViewInit {
  private readonly element = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private introContext: gsap.Context | null = null;
  private studyLoop: gsap.core.Timeline | null = null;

  readonly appearance = authAppearance;
  readonly activeStep = signal(0);
  readonly steps: readonly StudyStep[] = [
    {
      key: 'materias',
      label: 'Materias',
      icon: 'menu_book',
      description: 'Separá tus materiales por materia para encontrarlos rápido.',
    },
    {
      key: 'apuntes',
      label: 'Apuntes',
      icon: 'description',
      description: 'Guardá cada apunte junto con el tema que estás estudiando.',
    },
    {
      key: 'preguntas',
      label: 'Preguntas',
      icon: 'quiz',
      description: 'Convertí lo que leíste en preguntas para repasar.',
    },
  ];

  ngAfterViewInit(): void {
    const host = this.element.nativeElement;
    this.destroyRef.onDestroy(() => {
      this.introContext?.revert();
      this.studyLoop?.revert();
    });

    if (
      typeof window === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    this.introContext = gsap.context(() => {
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .fromTo(
          '[data-hero-brand]',
          { autoAlpha: 0, y: -6 },
          { autoAlpha: 1, y: 0, duration: 0.35 },
        )
        .fromTo(
          '[data-hero-copy]',
          { autoAlpha: 0, y: 10 },
          { autoAlpha: 1, y: 0, duration: 0.45 },
          '-=0.12',
        )
        .fromTo(
          '[data-study-flow]',
          { autoAlpha: 0, y: 12, scale: 0.985 },
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.45 },
          '-=0.14',
        )
        .call(() => this.startStudyLoop(), [], '-=0.08');
    }, host);
  }

  stepClass(index: number): string {
    const base = 'min-w-0 rounded-[16px] p-3 transition-[background-color,color,transform] duration-300 sm:p-4';
    return this.activeStep() === index
      ? `${base} bg-[var(--theme-accent-soft)] text-[var(--theme-foreground)]`
      : `${base} bg-[var(--theme-surface-high)] text-[var(--theme-muted)]`;
  }

  private startStudyLoop(): void {
    const loop = gsap.timeline({ repeat: -1, repeatDelay: 0.35 });
    const copy = '[data-study-copy]';

    for (const index of [1, 2, 0]) {
      loop
        .to({}, { duration: 1.45 })
        .to(copy, {
          autoAlpha: 0,
          y: -3,
          duration: 0.16,
          ease: 'power2.in',
        })
        .call(() => this.activeStep.set(index))
        .fromTo(
          copy,
          { autoAlpha: 0, y: 4 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.28,
            ease: 'power3.out',
            immediateRender: false,
          },
        );
    }

    this.studyLoop = loop;
  }
}
