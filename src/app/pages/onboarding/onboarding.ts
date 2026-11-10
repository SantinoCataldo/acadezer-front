import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { gsap } from 'gsap';
import { ThemePreferenceService } from '@core/services/theme-preference.service';

interface OnboardingColor {
  name: string;
  seed: string;
  swatch: string;
}

interface OnboardingStep {
  title: string;
  description: string;
  visual: 'overview' | 'subjects' | 'notes' | 'questions' | 'theme';
}

@Component({
  selector: 'app-onboarding',
  imports: [],
  templateUrl: './onboarding.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Onboarding implements AfterViewInit {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly preferences = inject(ThemePreferenceService);
  private animationContext: gsap.Context | null = null;
  private isTransitioning = false;

  readonly currentStep = signal(0);
  readonly isLeaving = signal(false);
  readonly selectedSeed = this.preferences.seed;
  readonly activeStep = computed(() => this.steps[this.currentStep()]);
  readonly steps: readonly OnboardingStep[] = [
    {
      title: 'Todo lo que estudiás, en un solo lugar.',
      description: 'Organizá tus materias, guardá tus apuntes y repasá sin perder el hilo.',
      visual: 'overview',
    },
    {
      title: 'Cada materia, con su propio espacio.',
      description: 'Separá tus cursadas para encontrar rápido lo que estás buscando.',
      visual: 'subjects',
    },
    {
      title: 'Tus apuntes, listos para volver.',
      description: 'Guardá lo importante con su materia y retomalo cuando quieras.',
      visual: 'notes',
    },
    {
      title: 'Convertí lo que leés en práctica.',
      description: 'Generá preguntas a partir de tus apuntes y comprobá qué ya sabés.',
      visual: 'questions',
    },
    {
      title: 'Dale tu color.',
      description: 'Elegí el acento que va a acompañarte por toda la aplicación.',
      visual: 'theme',
    },
  ];
  readonly colors: readonly OnboardingColor[] = [
    { name: 'Rojo', seed: '#DB3443', swatch: 'radial-gradient(circle at 30% 24%, #FFB8BE 0%, #DB3443 56%, #991528 100%)' },
    { name: 'Naranja', seed: '#F97316', swatch: 'radial-gradient(circle at 30% 24%, #FDBA74 0%, #F97316 56%, #C2410C 100%)' },
    { name: 'Verde', seed: '#10E37B', swatch: 'radial-gradient(circle at 30% 24%, #99FFD0 0%, #10E37B 56%, #00884C 100%)' },
    { name: 'Azul', seed: '#1673EF', swatch: 'radial-gradient(circle at 30% 24%, #A2D0FF 0%, #1673EF 56%, #073DAD 100%)' },
    { name: 'Violeta', seed: '#7652E8', swatch: 'radial-gradient(circle at 30% 24%, #CAB8FF 0%, #7652E8 56%, #4420A8 100%)' },
    { name: 'Magenta', seed: '#CB13DC', swatch: 'radial-gradient(circle at 30% 24%, #F5A9FF 0%, #CB13DC 56%, #79078A 100%)' },
    { name: 'Rosa', seed: '#D980B8', swatch: 'radial-gradient(circle at 30% 24%, #FFE0F2 0%, #D980B8 56%, #984C80 100%)' },
  ];
  readonly isMonochrome = computed(() => this.preferences.variant() === 'monochrome');

  ngAfterViewInit(): void {
    this.destroyRef.onDestroy(() => this.animationContext?.revert());
    this.revealItems();
  }

  chooseColor(color: OnboardingColor): void {
    this.preferences.setVariant('tonalSpot');
    this.preferences.setSeed(color.seed);
  }

  chooseMonochrome(): void {
    this.preferences.setVariant('monochrome');
  }

  continue(): void {
    if (this.currentStep() < this.steps.length - 1) {
      this.transitionTo(this.currentStep() + 1);
      return;
    }
    this.finish();
  }

  previous(): void {
    this.transitionTo(this.currentStep() - 1);
  }

  finish(): void {
    if (this.isLeaving()) return;
    this.isLeaving.set(true);
    this.playOut(() => void this.router.navigateByUrl('/estudio'));
  }

  private transitionTo(step: number): void {
    if (this.isTransitioning || this.currentStep() === step) return;

    if (this.prefersReducedMotion()) {
      this.currentStep.set(step);
      return;
    }

    this.isTransitioning = true;
    const items = this.revealTargets();
    gsap.to(items, {
      autoAlpha: 0,
      y: -5,
      filter: 'blur(6px)',
      duration: 0.12,
      ease: 'power1.in',
      stagger: 0.02,
      onComplete: () => {
        this.currentStep.set(step);
        requestAnimationFrame(() => {
          this.revealItems(() => { this.isTransitioning = false; });
        });
      },
    });
  }

  private playOut(onComplete: () => void): void {
    if (this.prefersReducedMotion()) {
      onComplete();
      return;
    }

    gsap.to(this.revealTargets(), {
      autoAlpha: 0,
      y: -5,
      filter: 'blur(6px)',
      duration: 0.12,
      ease: 'power1.in',
      stagger: 0.02,
      onComplete,
    });
  }

  private revealItems(onComplete?: () => void): void {
    if (this.prefersReducedMotion()) {
      onComplete?.();
      return;
    }

    this.animationContext?.revert();
    this.animationContext = gsap.context(() => {
      gsap.fromTo(
        '[data-reveal-item]',
        { autoAlpha: 0, y: 9, filter: 'blur(7px)' },
        {
          autoAlpha: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 0.28,
          ease: 'power2.out',
          stagger: 0.045,
          clearProps: 'filter,transform',
          onComplete,
        },
      );
    }, this.element.nativeElement);
  }

  private revealTargets(): HTMLElement[] {
    return Array.from(this.element.nativeElement.querySelectorAll<HTMLElement>('[data-reveal-item]'));
  }

  private prefersReducedMotion(): boolean {
    return typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
