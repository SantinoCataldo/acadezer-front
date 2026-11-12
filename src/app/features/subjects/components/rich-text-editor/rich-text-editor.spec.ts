import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RichTextEditor } from './rich-text-editor';

describe('RichTextEditor', () => {
  let fixture: ComponentFixture<RichTextEditor>;

  function editable(): HTMLElement {
    return fixture.nativeElement.querySelector('[contenteditable="true"]') as HTMLElement;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [RichTextEditor] });
    fixture = TestBed.createComponent(RichTextEditor);
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
      'Tachado',
      'Lista con viñetas',
      'Lista numerada',
      'Título',
      'Subtítulo',
      'Párrafo',
    ]);
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
    // El valor no se reescribe: el cursor del usuario no salta al inicio.
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
