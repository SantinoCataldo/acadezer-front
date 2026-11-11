import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import type { SubjectResponse } from '../../models';
import { SubjectList } from './subject-list';

/** El router real lo conecta el equipo: acá solo se necesita un destino válido. */
@Component({ selector: 'app-route-stub', template: '' })
class RouteStub {}

describe('SubjectList', () => {
  let requests: HttpTestingController;
  let fixture: ComponentFixture<SubjectList>;

  const subjects: SubjectResponse[] = [
    { id: 1, nombre: 'Análisis matemático', descripcion: null },
    { id: 2, nombre: 'Algoritmos', descripcion: 'Primer año' },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SubjectList],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'estudio', component: RouteStub },
          { path: 'estudio/materias/:id', component: RouteStub },
        ]),
      ],
    });
    requests = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  function open(): void {
    fixture = TestBed.createComponent(SubjectList);
    fixture.detectChanges();
  }

  function buttonWith(text: string): HTMLButtonElement {
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>);
    return buttons.find((button) => button.textContent?.includes(text)) as HTMLButtonElement;
  }

  function iconButton(label: string): HTMLButtonElement {
    return fixture.nativeElement.querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement;
  }

  function nombreInput(): HTMLInputElement {
    // El host de app-text-field también lleva el id: hay que buscar el input interno.
    return fixture.nativeElement.querySelector('app-text-field input') as HTMLInputElement;
  }

  it('shows the loading state before the first response', () => {
    open();

    expect(fixture.nativeElement.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Cargando materias…');

    requests.expectOne(`${environment.apiUrl}/api/materias`).flush(subjects);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[aria-busy="true"]')).toBeNull();
    requests.verify();
  });

  it('lists the subjects of the user', () => {
    open();
    requests.expectOne(`${environment.apiUrl}/api/materias`).flush(subjects);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Análisis matemático');
    expect(text).toContain('Sin descripción');
    expect(text).toContain('Algoritmos');
    expect(text).toContain('Primer año');
    requests.verify();
  });

  it('offers creating the first subject when there are none', () => {
    open();
    requests.expectOne(`${environment.apiUrl}/api/materias`).flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Todavía no creaste materias');

    buttonWith('Crear materia').click();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.textContent).toContain('Crear materia');
    requests.verify();
  });

  it('shows the error state and allows retrying', () => {
    open();
    requests
      .expectOne(`${environment.apiUrl}/api/materias`)
      .flush({ message: 'Servicio no disponible' }, { status: 503, statusText: 'Service Unavailable' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No pudimos cargar tus materias.');

    buttonWith('Reintentar').click();
    requests.expectOne(`${environment.apiUrl}/api/materias`).flush(subjects);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Algoritmos');
    requests.verify();
  });

  it('appends the created subject returned by the API without reloading the list', () => {
    open();
    requests.expectOne(`${environment.apiUrl}/api/materias`).flush(subjects);
    fixture.detectChanges();

    buttonWith('Crear materia').click();
    fixture.detectChanges();

    const input = nombreInput();
    input.value = '  Química  ';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    const created: SubjectResponse = { id: 3, nombre: 'Química', descripcion: null };
    const request = requests.expectOne(`${environment.apiUrl}/api/materias`);
    expect(request.request.body).toEqual({ nombre: 'Química', descripcion: null });
    request.flush(created);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Química');
    requests.expectNone(`${environment.apiUrl}/api/materias`);
    requests.verify();
  });

  it('edits a subject from the list and shows the saved name', () => {
    open();
    requests.expectOne(`${environment.apiUrl}/api/materias`).flush(subjects);
    fixture.detectChanges();

    iconButton('Editar Algoritmos').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]').textContent).toContain('Editar materia');
    expect(nombreInput().value).toBe('Algoritmos');

    (fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    const request = requests.expectOne(`${environment.apiUrl}/api/materias/2`);
    expect(request.request.method).toBe('PUT');
    request.flush({ id: 2, nombre: 'Algoritmos y estructuras de datos', descripcion: 'Primer año' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Algoritmos y estructuras de datos');
    requests.verify();
  });

  it('warns about the cascade deletion and removes the subject on success', () => {
    open();
    requests.expectOne(`${environment.apiUrl}/api/materias`).flush(subjects);
    fixture.detectChanges();

    iconButton('Eliminar Algoritmos').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]').textContent).toContain(
      'también se borran sus apuntes, pendientes, evaluaciones y asistencias',
    );

    buttonWith('Eliminar materia').click();
    requests
      .expectOne(`${environment.apiUrl}/api/materias/2`)
      .flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Algoritmos');
    expect(fixture.nativeElement.textContent).toContain('Análisis matemático');
    requests.verify();
  });

  it('keeps the subject in the list when the deletion fails', () => {
    open();
    requests.expectOne(`${environment.apiUrl}/api/materias`).flush(subjects);
    fixture.detectChanges();

    iconButton('Eliminar Algoritmos').click();
    fixture.detectChanges();
    buttonWith('Eliminar materia').click();
    requests
      .expectOne(`${environment.apiUrl}/api/materias/2`)
      .flush({ message: 'No se pudo eliminar la materia' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No se pudo eliminar la materia');
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Algoritmos');
    requests.verify();
  });
});
