import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Modal } from './modal';

@Component({
  standalone: true,
  imports: [Modal],
  template: `
    <button type="button" id="trigger">Abrir</button>
    @if (visible()) {
      <app-modal title="Crear materia" [pending]="pending()" (closed)="closed()">
        <button type="button">primero</button>
        <button type="button">segundo</button>
      </app-modal>
    }
  `,
})
class ModalHost {
  readonly visible = signal(true);
  readonly pending = signal(false);
  readonly closed = vi.fn();
}

describe('Modal', () => {
  let fixture: ComponentFixture<ModalHost>;
  let host: ModalHost;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ModalHost] });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  function open(): void {
    fixture = TestBed.createComponent(ModalHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
  }

  function dialog(): HTMLElement {
    return fixture.nativeElement.querySelector('[role="dialog"]');
  }

  it('exposes an accessible dialog labelled by its title', () => {
    open();

    const element = dialog();
    expect(element.getAttribute('aria-modal')).toBe('true');
    expect(element.getAttribute('aria-labelledby')).toContain('modal-title');
    expect(fixture.nativeElement.textContent).toContain('Crear materia');
  });

  it('moves focus into the dialog and restores it after closing', () => {
    open();
    const trigger = fixture.nativeElement.querySelector('#trigger') as HTMLButtonElement;
    trigger.focus();

    host.visible.set(false);
    fixture.detectChanges();
    expect(document.activeElement).toBe(trigger);

    host.visible.set(true);
    fixture.detectChanges();

    expect(document.activeElement).toBe(dialog());

    host.visible.set(false);
    fixture.detectChanges();

    expect(document.activeElement).toBe(trigger);
  });

  it('closes with Escape when nothing is pending', () => {
    open();
    dialog().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(host.closed).toHaveBeenCalled();
  });

  it('ignores Escape while the action is pending', () => {
    open();
    host.pending.set(true);
    fixture.detectChanges();

    dialog().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(host.closed).not.toHaveBeenCalled();
  });

  it('keeps Tab focus inside the dialog', () => {
    open();
    // El diálogo trae su propio botón de cierre más los dos proyectados.
    const buttons = Array.from(dialog().querySelectorAll<HTMLButtonElement>('button'));
    expect(buttons).toHaveLength(3);

    const [first, , last] = buttons;

    last.focus();
    dialog().dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(first);

    first.focus();
    dialog().dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    expect(document.activeElement).toBe(last);
  });
});
