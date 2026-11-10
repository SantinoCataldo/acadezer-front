import {
  AfterViewInit,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
} from '@angular/core';
import { gsap } from 'gsap';

@Directive({
  selector: '[appAuthFormReveal]',
  standalone: true,
})
export class AuthFormReveal implements AfterViewInit {
  private readonly element = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  ngAfterViewInit(): void {
    if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const reveal = gsap.context(() => {
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
        },
      );
    }, this.element.nativeElement);

    this.destroyRef.onDestroy(() => reveal.revert());
  }
}
