import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  AfterViewInit,
  inject,
  input,
  output,
  Renderer2,
  signal,
  viewChild,
} from '@angular/core';
import { gsap } from 'gsap';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function isFocusable(element: HTMLElement): boolean {
  return !element.hasAttribute('disabled') && element.closest('[aria-hidden="true"]') === null;
}

let modalSequence = 0;

/**
 * Diálogo accesible y autocontenido (sin CDK overlay para no depender de
 * estilos globales compartidos). Cubre RNF-01: foco atrapado, Escape para
 * cerrar, foco devuelto al abrirse y cierre bloqueado durante el envío.
 */
@Component({
  selector: 'app-modal',
  templateUrl: './modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Modal implements AfterViewInit {
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
  readonly panelClass = input('');
  /** Mientras sea true, Escape y el fondo no cierran el diálogo. */
  readonly pending = input(false);
  readonly closed = output<void>();
  readonly closing = signal(false);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly renderer = inject(Renderer2);
  private readonly backdrop = viewChild.required<ElementRef<HTMLElement>>('backdrop');
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private readonly titleId = `modal-title-${++modalSequence}`;
  readonly descriptionId = `modal-description-${modalSequence}`;
  private restoreFocus: HTMLElement | null = null;
  private animationContext: gsap.Context | null = null;
  private touchStartY: number | null = null;
  private dragStartedAt = 0;
  private dragDistance = 0;

  ngAfterViewInit(): void {
    const active = document.activeElement;
    this.restoreFocus = active instanceof HTMLElement ? active : null;
    const panel = this.panel().nativeElement;
    const backdrop = this.backdrop().nativeElement;
    panel.focus();
    this.destroyRef.onDestroy(this.renderer.listen('document', 'keydown', (event: KeyboardEvent) => this.handleKeydown(event)));
    const onTouchStart = (event: TouchEvent): void => this.startDrag(event);
    const onTouchMove = (event: TouchEvent): void => this.moveDrag(event);
    const onTouchEnd = (event: TouchEvent): void => this.endDrag(event);
    panel.addEventListener('touchstart', onTouchStart, { passive: true });
    panel.addEventListener('touchmove', onTouchMove, { passive: false });
    panel.addEventListener('touchend', onTouchEnd, { passive: true });
    panel.addEventListener('touchcancel', onTouchEnd, { passive: true });
    this.destroyRef.onDestroy(() => {
      panel.removeEventListener('touchstart', onTouchStart);
      panel.removeEventListener('touchmove', onTouchMove);
      panel.removeEventListener('touchend', onTouchEnd);
      panel.removeEventListener('touchcancel', onTouchEnd);
    });

    if (!this.prefersReducedMotion()) {
      this.animationContext = gsap.context(() => {
        gsap.set([backdrop, panel], { willChange: 'opacity, transform' });
        gsap.fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.18, ease: 'power1.out' });
        gsap.fromTo(
          panel,
          { autoAlpha: 0, y: 12, scale: 0.985, filter: 'blur(6px)' },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            filter: 'blur(0px)',
            duration: 0.28,
            ease: 'power2.out',
            onComplete: () => gsap.set([backdrop, panel], { clearProps: 'willChange,filter,transform,opacity,visibility' }),
          },
        );
      }, this.host.nativeElement);
    }

    this.destroyRef.onDestroy(() => {
      gsap.killTweensOf([panel, backdrop]);
      this.animationContext?.revert();
      if (this.restoreFocus?.isConnected) this.restoreFocus.focus();
    });
  }

  requestClose(): void {
    if (this.pending() || this.closing()) return;
    this.closing.set(true);

    if (this.prefersReducedMotion()) {
      this.closed.emit();
      return;
    }

    const panel = this.panel().nativeElement;
    const backdrop = this.backdrop().nativeElement;
    panel.inert = true;
    gsap.killTweensOf([panel, backdrop]);
    gsap.set([backdrop, panel], { willChange: 'opacity, transform' });
    gsap.timeline({ onComplete: () => this.closed.emit() })
      .to(panel, { autoAlpha: 0, y: 10, scale: 0.985, filter: 'blur(5px)', duration: 0.18, ease: 'power1.in' }, 0)
      .to(backdrop, { autoAlpha: 0, duration: 0.18, ease: 'power1.in' }, 0);
  }

  handleKeydown(event: KeyboardEvent): void {
    const panel = this.panel().nativeElement;
    if (!this.isTopmost(panel)) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.requestClose();
      return;
    }
    if (event.key === 'Tab' && panel.contains(document.activeElement)) this.trapFocus(event);
  }

  private startDrag(event: TouchEvent): void {
    if (this.pending() || this.closing() || event.touches.length !== 1 || window.matchMedia('(min-width: 640px)').matches) return;
    const panel = this.panel().nativeElement;
    if (panel.scrollTop > 0) return;
    this.touchStartY = event.touches[0].clientY;
    this.dragStartedAt = performance.now();
    this.dragDistance = 0;
    gsap.killTweensOf(panel);
    gsap.set(panel, { willChange: 'transform' });
  }

  private moveDrag(event: TouchEvent): void {
    if (this.touchStartY === null) return;
    if (event.touches.length !== 1) {
      this.touchStartY = null;
      gsap.set(this.panel().nativeElement, { clearProps: 'willChange,transform' });
      gsap.set(this.backdrop().nativeElement, { clearProps: 'opacity' });
      return;
    }
    const distance = event.touches[0].clientY - this.touchStartY;
    const panel = this.panel().nativeElement;
    const backdrop = this.backdrop().nativeElement;
    if (distance < 8) {
      if (this.dragDistance > 0) {
        this.dragDistance = 0;
        gsap.set(panel, { y: 0 });
        gsap.set(backdrop, { opacity: 1 });
      }
      return;
    }
    if (panel.scrollTop > 0) {
      this.touchStartY = null;
      gsap.set([panel, backdrop], { clearProps: 'willChange,transform,opacity' });
      return;
    }
    event.preventDefault();
    this.dragDistance = distance;
    gsap.set(panel, { y: this.dragDistance });
    const progress = Math.min(1, this.dragDistance / (panel.getBoundingClientRect().height * 0.65));
    gsap.set(backdrop, { opacity: 1 - progress * 0.45 });
  }

  private endDrag(event: TouchEvent): void {
    if (this.touchStartY === null) return;
    if (event.type === 'touchend' && event.touches.length > 0) return;
    this.touchStartY = null;
    const elapsed = Math.max(1, performance.now() - this.dragStartedAt);
    const velocity = this.dragDistance / elapsed;
    const panel = this.panel().nativeElement;
    const backdrop = this.backdrop().nativeElement;

    if (event.type !== 'touchcancel' && (this.dragDistance >= 112 || (this.dragDistance >= 44 && velocity >= 0.65))) {
      this.closeFromDrag(panel, backdrop);
      return;
    }

    if (this.prefersReducedMotion()) {
      gsap.set(panel, { clearProps: 'willChange,transform' });
      gsap.set(backdrop, { clearProps: 'opacity' });
      return;
    }
    gsap.to(panel, {
      y: 0,
      duration: 0.2,
      ease: 'power2.out',
      onComplete: () => gsap.set(panel, { clearProps: 'willChange,transform' }),
    });
    gsap.to(backdrop, { opacity: 1, duration: 0.2, ease: 'power2.out', clearProps: 'opacity' });
  }

  private closeFromDrag(panel: HTMLElement, backdrop: HTMLElement): void {
    if (this.pending() || this.closing()) return;
    this.closing.set(true);
    if (this.prefersReducedMotion()) {
      this.closed.emit();
      return;
    }
    panel.inert = true;
    gsap.killTweensOf([panel, backdrop]);
    gsap.set([backdrop, panel], { willChange: 'opacity, transform' });
    gsap.timeline({ onComplete: () => this.closed.emit() })
      .to(panel, { autoAlpha: 0, y: window.innerHeight, duration: 0.22, ease: 'power2.in' }, 0)
      .to(backdrop, { autoAlpha: 0, duration: 0.18, ease: 'power1.in' }, 0);
  }

  private isTopmost(panel: HTMLElement): boolean {
    const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]');
    return dialogs.item(dialogs.length - 1) === panel;
  }

  private trapFocus(event: KeyboardEvent): void {
    const panel = this.panel().nativeElement;
    const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isFocusable);
    if (focusable.length === 0) {
      event.preventDefault();
      panel.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && (active === first || active === panel)) {
      event.preventDefault();
      last.focus();
    }
  }

  private prefersReducedMotion(): boolean {
    return typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
