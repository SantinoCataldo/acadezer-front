import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach } from 'vitest';
import { RichTextEditor } from './rich-text-editor';

const originalCommandDescriptors = [
  ['execCommand', Object.getOwnPropertyDescriptor(document, 'execCommand')],
  ['queryCommandState', Object.getOwnPropertyDescriptor(document, 'queryCommandState')],
  ['queryCommandValue', Object.getOwnPropertyDescriptor(document, 'queryCommandValue')],
] as const;

describe('RichTextEditor', () => {
  let fixture: ComponentFixture<RichTextEditor>;

  function editable(): HTMLElement {
    return fixture.nativeElement.querySelector('[contenteditable="true"]') as HTMLElement;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [RichTextEditor] });
    fixture = TestBed.createComponent(RichTextEditor);
  });

  afterEach(() => {
    for (const [property, descriptor] of originalCommandDescriptors) {
      if (descriptor) Object.defineProperty(document, property, descriptor);
      else Reflect.deleteProperty(document, property);
    }
    window.getSelection()?.removeAllRanges();
  });

  it('renders the formatting actions the brief asks for', () => {
    fixture.detectChanges();
    const labels = Array.from(
      fixture.nativeElement.querySelectorAll('button[aria-label]') as NodeListOf<HTMLButtonElement>,
    ).map((button) => button.getAttribute('aria-label'));

    expect(labels).toEqual([
      'Deshacer',
      'Rehacer',
      'Negrita',
      'Cursiva',
      'Subrayado',
      'Lista con viñetas',
      'Lista numerada',
      'Título 1',
      'Título 2',
      'Alinear a la izquierda',
      'Centrar',
      'Alinear a la derecha',
    ]);
  });

  it('restores the selected text before applying a toolbar command', () => {
    fixture.detectChanges();
    editable().innerHTML = '<p>Texto para formato</p>';
    const text = editable().querySelector('p')?.firstChild;
    if (!text) throw new Error('Editable text node was not rendered');
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, 5);
    window.getSelection()?.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));

    const execCommand = vi.fn(() => true);
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand });
    const centerButton = fixture.nativeElement.querySelector('[aria-label="Centrar"]') as HTMLButtonElement;
    centerButton.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));
    window.getSelection()?.removeAllRanges();
    centerButton.click();

    expect(execCommand).toHaveBeenCalledWith('justifyCenter', false, undefined);
    expect(window.getSelection()?.toString()).toBe('Texto');
  });

  it('keeps the toolbar clicks from stealing the focus of the editable', () => {
    fixture.detectChanges();
    const editableElement = editable();
    editableElement.innerHTML = '<p>Texto</p>';
    editableElement.focus();

    const boton = fixture.nativeElement.querySelector('[aria-label="Negrita"]') as HTMLButtonElement;
    const mousedown = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    boton.dispatchEvent(mousedown);

    expect(mousedown.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(editableElement);
  });

  it('applies bold, italic and underline one after the other without dropping the others', () => {
    fixture.detectChanges();
    editable().innerHTML = '<p>Texto</p>';
    const texto = editable().querySelector('p')?.firstChild;
    if (!texto) throw new Error('Editable text node was not rendered');
    const range = document.createRange();
    range.setStart(texto, 0);
    range.setEnd(texto, 5);
    window.getSelection()?.addRange(range);

    const execCommand = vi.fn((...args: unknown[]) => {
      void args;
      return true;
    });
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand });

    for (const etiqueta of ['Negrita', 'Cursiva', 'Subrayado']) {
      const boton = fixture.nativeElement.querySelector(`[aria-label="${etiqueta}"]`) as HTMLButtonElement;
      boton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      boton.click();
    }

    expect(execCommand.mock.calls.map((call) => call[0])).toEqual(['bold', 'italic', 'underline']);
    expect(window.getSelection()?.toString()).toBe('Texto');
  });

  it('removes the heading when the same title button is clicked again', () => {
    fixture.detectChanges();
    editable().innerHTML = '<p>Texto</p>';
    const texto = editable().querySelector('p')?.firstChild;
    if (!texto) throw new Error('Editable text node was not rendered');
    const range = document.createRange();
    range.selectNodeContents(texto);
    window.getSelection()?.addRange(range);

    let block = '<p>';
    Object.defineProperty(document, 'queryCommandValue', { configurable: true, value: () => block });
    document.dispatchEvent(new Event('selectionchange'));

    const execCommand = vi.fn(() => true);
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand });
    const boton = fixture.nativeElement.querySelector('[aria-label="Título 1"]') as HTMLButtonElement;

    boton.click();
    expect(execCommand).toHaveBeenLastCalledWith('formatBlock', false, 'H1');
    fixture.detectChanges();

    block = '<h1>';
    document.dispatchEvent(new Event('selectionchange'));
    fixture.detectChanges();
    expect(boton.getAttribute('aria-pressed')).toBe('true');

    boton.click();
    expect(execCommand).toHaveBeenLastCalledWith('formatBlock', false, 'p');
    fixture.detectChanges();

    block = '<p>';
    document.dispatchEvent(new Event('selectionchange'));
    fixture.detectChanges();
    expect(boton.getAttribute('aria-pressed')).toBe('false');
  });

  it('shows simultaneous active text, list, and heading formats', () => {
    fixture.detectChanges();
    Object.defineProperty(document, 'queryCommandState', {
      configurable: true,
      value: (command: string) => ['bold', 'italic', 'underline', 'insertOrderedList'].includes(command),
    });
    Object.defineProperty(document, 'queryCommandValue', {
      configurable: true,
      value: () => '<H2>',
    });
    const editableElement = editable();
    const text = document.createTextNode('Texto');
    const heading = document.createElement('h2');
    heading.append(text);
    editableElement.append(heading);
    const range = document.createRange();
    range.selectNodeContents(text);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[aria-label="Negrita"]').getAttribute('aria-pressed')).toBe('true');
    expect(fixture.nativeElement.querySelector('[aria-label="Cursiva"]').getAttribute('aria-pressed')).toBe('true');
    expect(fixture.nativeElement.querySelector('[aria-label="Subrayado"]').getAttribute('aria-pressed')).toBe('true');
    expect(fixture.nativeElement.querySelector('[aria-label="Lista numerada"]').getAttribute('aria-pressed')).toBe('true');
    expect(fixture.nativeElement.querySelector('[aria-label="Título 2"]').getAttribute('aria-pressed')).toBe('true');
    expect(fixture.nativeElement.querySelector('[aria-label="Título 1"]').getAttribute('aria-pressed')).toBe('false');
  });

  it('writes the incoming value into the editable surface, sanitizing it', () => {
    fixture.componentRef.setInput('value', '<p>Hola</p><script>alert(1)</script>');
    fixture.detectChanges();

    expect(editable().innerHTML).toBe('<p>Hola</p>');
    expect(editable().querySelector('script')).toBeNull();
  });

  it('emits what the user types without writing the value back over it', () => {
    fixture.componentRef.setInput('value', '<p>Hola</p>');
    fixture.detectChanges();
    const emitted = vi.fn();
    fixture.componentInstance.valueChange.subscribe(emitted);

    editable().innerHTML = '<p>Hola <b>mundo</b></p>';
    editable().dispatchEvent(new Event('input'));

    expect(emitted).toHaveBeenCalledWith('<p>Hola <b>mundo</b></p>');
    expect(editable().innerHTML).toBe('<p>Hola <b>mundo</b></p>');
  });

  it('shows the error message only when invalid', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();

    fixture.componentRef.setInput('invalid', true);
    fixture.componentRef.setInput('errorText', 'El contenido no puede quedar vacío.');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'El contenido no puede quedar vacío.',
    );
  });
});
