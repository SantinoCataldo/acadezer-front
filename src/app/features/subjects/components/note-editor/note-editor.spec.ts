import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../../environments/environment';
import type { NoteResponse } from '../../models';
import { NoteEditor } from './note-editor';

describe('NoteEditor', () => {
  let requests: HttpTestingController;
  let fixture: ComponentFixture<NoteEditor>;

  const note: NoteResponse = {
    id: 3,
    titulo: 'Variables',
    contenido: '<p>Tipos</p>',
    materiaId: 7,
    creadoEn: '2026-05-01T10:00:00Z',
    actualizadoEn: '2026-05-04T12:30:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NoteEditor],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    requests = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  function openNote(current: NoteResponse | null): void {
    fixture = TestBed.createComponent(NoteEditor);
    fixture.componentRef.setInput('materiaId', 7);
    fixture.componentRef.setInput('note', current);
    fixture.detectChanges();
  }

  function content(): HTMLElement {
    return fixture.nativeElement.querySelector('[contenteditable="true"]') as HTMLElement;
  }

  function typeContent(html: string): void {
    content().innerHTML = html;
    content().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function buttonWith(label: string): HTMLButtonElement {
    return Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.includes(label)) as HTMLButtonElement;
  }

  /** Los botones del diálogo de confirmación: el fondo tapa el resto de la pantalla. */
  function dialogButton(label: string): HTMLButtonElement {
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
    return Array.from(dialog.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(
      (button) => button.textContent?.includes(label),
    ) as HTMLButtonElement;
  }

  it('fills the fields from the note it opens', () => {
    openNote(note);

    expect((fixture.nativeElement.querySelector('#apunte-titulo') as HTMLInputElement).value).toBe(
      'Variables',
    );
    expect(content().innerHTML).toBe('<p>Tipos</p>');

    (
      fixture.nativeElement.querySelector('[aria-label="Ver información del apunte"]') as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Fecha de creación');
    expect(fixture.nativeElement.textContent).toContain('#3');
    requests.verify();
  });

  it('starts empty when creating', () => {
    openNote(null);

    expect((fixture.nativeElement.querySelector('#apunte-titulo') as HTMLInputElement).value).toBe(
      '',
    );
    expect(content().innerHTML).toBe('');
    expect(fixture.nativeElement.querySelector('[contenteditable="true"]').getAttribute('data-placeholder')).toBe(
      'Escribí el contenido del apunte…',
    );
    expect(
      fixture.nativeElement.querySelector('button[aria-label="Eliminar este apunte"]'),
    ).toBeNull();
    requests.verify();
  });

  it('rejects a blank title and a content without text', () => {
    openNote(null);
    const titulo = fixture.nativeElement.querySelector('#apunte-titulo') as HTMLInputElement;
    typeContent('<p><br></p>');
    buttonWith('Guardar').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Escribí un título para el apunte.');
    expect(fixture.nativeElement.textContent).toContain('El contenido no puede quedar vacío.');
    requests.expectNone(`${environment.apiUrl}/api/materias/7/apuntes`);
    requests.verify();

    titulo.value = 'Válido';
    titulo.dispatchEvent(new Event('input'));
    typeContent('<p>con texto</p>');
    buttonWith('Guardar').click();

    requests
      .expectOne(`${environment.apiUrl}/api/materias/7/apuntes`)
      .flush({ ...note, id: 9, titulo: 'Válido' });
    requests.verify();
  });

  it('keeps the error visible when the save fails', () => {
    openNote(note);
    typeContent('<p>Cambio</p>');
    buttonWith('Guardar').click();
    requests
      .expectOne(`${environment.apiUrl}/api/apuntes/3`)
      .flush({ message: 'No se pudo guardar' }, { status: 500, statusText: 'Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No se pudo guardar');
    expect(buttonWith('Guardar').disabled).toBe(false);
    requests.verify();
  });

  it('deletes after confirming and reports it to the parent', () => {
    openNote(note);
    const deleted = vi.fn();
    fixture.componentInstance.deleted.subscribe(deleted);

    (
      fixture.nativeElement.querySelector(
        'button[aria-label="Eliminar este apunte"]',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    dialogButton('Eliminar apunte').click();
    requests
      .expectOne(`${environment.apiUrl}/api/apuntes/3`)
      .flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();

    expect(deleted).toHaveBeenCalled();
    // El diálogo se cierra tras borrar.
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('closes the confirmation without deleting when declining', () => {
    openNote(note);
    (
      fixture.nativeElement.querySelector(
        'button[aria-label="Eliminar este apunte"]',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    dialogButton('Cancelar').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    requests.expectNone(`${environment.apiUrl}/api/apuntes/3`);
  });
});
