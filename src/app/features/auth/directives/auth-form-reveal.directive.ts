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

    const reveal = gsap.fromTo(
      this.element.nativeElement,
      { autoAlpha: 0, y: 20, filter: 'blur(8px)' },
      {
        autoAlpha: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: 0.65,
        delay: 0.12,
        ease: 'power3.out',
      },
    );

    this.destroyRef.onDestroy(() => reveal.kill());
  }
}
