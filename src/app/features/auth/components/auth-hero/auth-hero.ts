import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
} from '@angular/core';
import { gsap } from 'gsap';
import { authAppearance } from '@features/auth/auth-theme';
@Component({
  selector: 'app-auth-hero',
  templateUrl: './auth-hero.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthHero implements AfterViewInit {
  private readonly element = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private introContext: gsap.Context | null = null;

  readonly appearance = authAppearance;

  ngAfterViewInit(): void {
    const host = this.element.nativeElement;
    this.destroyRef.onDestroy(() => {
      this.introContext?.revert();
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
        );
    }, host);
  }
}
