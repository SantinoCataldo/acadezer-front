import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  AfterViewInit,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';

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
  styleUrl: './modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Modal implements AfterViewInit {
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
  /** Mientras sea true, Escape y el fondo no cierran el diálogo. */
  readonly pending = input(false);
  readonly closed = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private readonly titleId = `modal-title-${++modalSequence}`;
  readonly descriptionId = `modal-description-${modalSequence}`;
  private restoreFocus: HTMLElement | null = null;

  ngAfterViewInit(): void {
    const active = document.activeElement;
    this.restoreFocus = active instanceof HTMLElement ? active : null;
    // Foco en el contenedor: el lector anuncia el título y Tab entra al contenido.
    this.panel().nativeElement.focus();
    this.destroyRef.onDestroy(() => {
      if (this.restoreFocus?.isConnected) this.restoreFocus.focus();
    });
  }

  requestClose(): void {
    if (this.pending()) return;
    this.closed.emit();
  }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.requestClose();
      return;
    }
    if (event.key === 'Tab') this.trapFocus(event);
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
}
