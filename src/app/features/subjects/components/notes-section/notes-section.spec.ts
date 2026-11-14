import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../../environments/environment';
import type { NoteResponse } from '../../models';
import { NotesSection } from './notes-section';

describe('NotesSection', () => {
  let requests: HttpTestingController;
  let fixture: ComponentFixture<NotesSection>;

  function note(
    id: number,
    titulo: string,
    contenido = '<p>hola</p>',
    actualizadoEn = '2026-05-04T10:00:00Z',
  ): NoteResponse {
    return { id, titulo, contenido, materiaId: 7, creadoEn: '2026-05-01T10:00:00Z', actualizadoEn };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NotesSection],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    requests = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  function open(): void {
    fixture = TestBed.createComponent(NotesSection);
    fixture.componentRef.setInput('materiaId', 7);
    fixture.detectChanges();
    flushList([note(1, 'Variables', '<p>Tipos</p>')]);
  }

  function flushList(notes: NoteResponse[]): void {
    requests.expectOne(`${environment.apiUrl}/api/materias/7/apuntes`).flush(notes);
    fixture.detectChanges();
  }

  function text(): string {
    return fixture.nativeElement.textContent;
  }

  function buttonWith(label: string): HTMLButtonElement {
    return Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.includes(label)) as HTMLButtonElement;
  }

  it('lists the notes of that subject and sorts the last edited first', () => {
    fixture = TestBed.createComponent(NotesSection);
    fixture.componentRef.setInput('materiaId', 7);
    fixture.detectChanges();
    const list = requests.expectOne(`${environment.apiUrl}/api/materias/7/apuntes`);
    expect(list.request.method).toBe('GET');

    list.flush([
      note(1, 'Viejo', '<p>a</p>', '2026-05-01T10:00:00Z'),
      note(2, 'Nuevo', '<p>b</p>', '2026-05-09T10:00:00Z'),
    ]);
    fixture.detectChanges();

    const titles = Array.from(
      fixture.nativeElement.querySelectorAll('li button span.truncate') as NodeListOf<HTMLElement>,
    ).map((heading) => heading.textContent?.trim());
    expect(titles[0]).toBe('Nuevo');
    expect(titles[1]).toBe('Viejo');
    expect(text()).toContain('2 apuntes');
    expect(text()).toContain('Modificado');
  });

  it('explains the empty state and offers to write the first note', () => {
    fixture = TestBed.createComponent(NotesSection);
    fixture.componentRef.setInput('materiaId', 7);
    fixture.detectChanges();
    flushList([]);

    expect(text()).toContain('Todavía no escribiste apuntes para esta materia.');
    expect(text()).toContain('Todavía no hay apuntes en esta materia.');
    expect(text()).toContain('Nuevo apunte');
  });

  it('shows the loading state before the answer arrives', () => {
    fixture = TestBed.createComponent(NotesSection);
    fixture.componentRef.setInput('materiaId', 7);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain(
      'Cargando apuntes',
    );
    requests.expectOne(`${environment.apiUrl}/api/materias/7/apuntes`).flush([]);
  });

  it('shows a retry when the list cannot be loaded', () => {
    fixture = TestBed.createComponent(NotesSection);
    fixture.componentRef.setInput('materiaId', 7);
    fixture.detectChanges();
    requests
      .expectOne(`${environment.apiUrl}/api/materias/7/apuntes`)
      .flush({ message: 'Fallo' }, { status: 500, statusText: 'Error' });
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alert.textContent).toContain('Fallo');
    buttonWith('Reintentar').click();
    expect(requests.expectOne(`${environment.apiUrl}/api/materias/7/apuntes`).request.method).toBe(
      'GET',
    );
  });

  it('opens a note in the editor and loads its content', () => {
    open();
    buttonWith('Variables').click();
    fixture.detectChanges();

    const titulo = fixture.nativeElement.querySelector('#apunte-titulo') as HTMLInputElement;
    expect(titulo.value).toBe('Variables');
    expect(fixture.nativeElement.querySelector('[contenteditable="true"]').innerHTML).toBe(
      '<p>Tipos</p>',
    );
    expect(fixture.nativeElement.querySelector('app-note-editor')).not.toBeNull();
  });

  it('creates a note for that subject and shows it in the list', () => {
    open();
    buttonWith('Nuevo apunte').click();
    fixture.detectChanges();

    const titulo = fixture.nativeElement.querySelector('#apunte-titulo') as HTMLInputElement;
    titulo.value = 'Parcial';
    titulo.dispatchEvent(new Event('input'));
    const editable = fixture.nativeElement.querySelector('[contenteditable="true"]') as HTMLElement;
    editable.innerHTML = '<p>Fecha del parcial</p>';
    editable.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    buttonWith('Guardar').click();

    const create = requests.expectOne(`${environment.apiUrl}/api/materias/7/apuntes`);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({
      titulo: 'Parcial',
      contenido: '<p>Fecha del parcial</p>',
    });
    create.flush(note(5, 'Parcial', '<p>Fecha del parcial</p>'));
    fixture.detectChanges();

    expect(text()).toContain('Parcial');
    const tituloGuardado = fixture.nativeElement.querySelector('#apunte-titulo') as HTMLInputElement;
    expect(tituloGuardado.value).toBe('Parcial');
    expect(fixture.nativeElement.querySelector('[contenteditable="true"]').innerHTML).toBe(
      '<p>Fecha del parcial</p>',
    );
  });

  it('edits a note and persists the change', () => {
    open();
    buttonWith('Variables').click();
    fixture.detectChanges();

    const editable = fixture.nativeElement.querySelector('[contenteditable="true"]') as HTMLElement;
    editable.innerHTML = '<p>Tipos y valores</p>';
    editable.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    buttonWith('Guardar').click();

    const update = requests.expectOne(`${environment.apiUrl}/api/apuntes/1`);
    expect(update.request.method).toBe('PUT');
    expect(update.request.body).toEqual({
      titulo: 'Variables',
      contenido: '<p>Tipos y valores</p>',
    });
    update.flush(note(1, 'Variables', '<p>Tipos y valores</p>'));
    fixture.detectChanges();

    expect(text()).toContain('Tipos y valores');
  });

  it('deletes a note after confirming and removes it from the list', () => {
    open();
    buttonWith('Variables').click();
    fixture.detectChanges();

    (
      fixture.nativeElement.querySelector(
        'button[aria-label="Eliminar este apunte"]',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    buttonWith('Eliminar apunte').click();

    requests
      .expectOne(`${environment.apiUrl}/api/apuntes/1`)
      .flush(null, { status: 204, statusText: 'No Content' });
    flushList([]);
    fixture.detectChanges();

    expect(text()).toContain('Todavía no escribiste apuntes para esta materia.');
  });

  it('cancels the edition without sending anything', () => {
    open();
    buttonWith('Variables').click();
    fixture.detectChanges();

    buttonWith('Cancelar').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#apunte-titulo')).toBeNull();
    requests.expectNone(`${environment.apiUrl}/api/apuntes/1`);
  });
});
