import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import type { SubjectResponse } from '../../models';
import { SubjectDetail } from './subject-detail';

@Component({ selector: 'app-route-stub', template: '' })
class RouteStub {}

describe('SubjectDetail', () => {
  let requests: HttpTestingController;
  let fixture: ComponentFixture<SubjectDetail>;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SubjectDetail],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'estudio', component: RouteStub },
          { path: 'estudio/evaluaciones', component: RouteStub },
          { path: 'estudio/materias', component: RouteStub },
          { path: 'estudio/materias/:id', component: RouteStub },
        ]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: '7' })),
            snapshot: { paramMap: convertToParamMap({ id: '7' }) },
          },
        },
      ],
    });
    requests = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  function open(): void {
    fixture = TestBed.createComponent(SubjectDetail);
    fixture.detectChanges();
  }

  function buttonWith(text: string): HTMLButtonElement {
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>);
    return buttons.find((button) => button.textContent?.includes(text)) as HTMLButtonElement;
  }

  function nombreInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('app-text-field input') as HTMLInputElement;
  }

  function flushNotes(): void {
    fixture.detectChanges();
    requests.expectOne(`${environment.apiUrl}/api/materias/7/apuntes`).flush([]);
    requests.expectOne(`${environment.apiUrl}/api/materias/7/pendientes`).flush([]);
  }

  function flushEvaluaciones(evaluaciones: unknown[] = []): void {
    fixture.detectChanges();
    const reqs = requests.match(`${environment.apiUrl}/api/materias/7/evaluaciones`);
    for (const req of reqs) {
      req.flush(evaluaciones);
    }
  }

  function openAndFlush(evaluaciones: unknown[] = []): void {
    open();
    requests.expectOne(`${environment.apiUrl}/api/materias/7`).flush({ id: 7, nombre: 'Física' });
    flushNotes();
    flushEvaluaciones(evaluaciones);
    fixture.detectChanges();
  }

  it('shows the subject and its sections', () => {
    openAndFlush();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Física');
    expect(text).toContain('Fecha de inicio pendiente');
    expect(text).toContain('Apuntes');
    expect(text).toContain('Tareas pendientes');
    expect(text).toContain('Evaluaciones');
    expect(text).toContain('Asistencia');
    requests.verify();
  });

  it('reports an unavailable subject without revealing other users data', () => {
    open();
    requests
      .expectOne(`${environment.apiUrl}/api/materias/7`)
      .flush({ message: 'Materia no encontrada' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Esta materia no está disponible');
    expect(fixture.nativeElement.textContent).not.toContain('Física');
    requests.verify();
  });

  it('edits the subject and shows the data confirmed by the API', () => {
    openAndFlush();

    buttonWith('Editar').click();
    fixture.detectChanges();

    const input = nombreInput();
    expect(input.value).toBe('Física');

    input.value = 'Física II';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    const request = requests.expectOne(`${environment.apiUrl}/api/materias/7`);
    expect(request.request.method).toBe('PUT');
    request.flush({ id: 7, nombre: 'Física II', descripcion: null });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Física II');
    requests.verify();
  });

  it('returns to the list after deleting the subject', () => {
    openAndFlush();

    buttonWith('Eliminar').click();
    fixture.detectChanges();
    buttonWith('Eliminar materia').click();

    requests.expectOne(`${environment.apiUrl}/api/materias/7`).flush(null, { status: 204, statusText: 'No Content' });

    expect(router.navigateByUrl).toHaveBeenCalledWith('/estudio/materias');
    requests.verify();
  });

  it('shows the promedio and the estado of the cursada of the subject', () => {
    openAndFlush([
      {
        id: 1,
        materiaId: 7,
        nombre: 'Primer parcial',
        fecha: '2026-09-20',
        tipo: 'PARCIAL_1',
        estado: 'APROBADO',
        calificacion: 9,
      },
      {
        id: 2,
        materiaId: 7,
        nombre: 'Segundo parcial',
        fecha: '2026-11-05',
        calificacion: 7,
      },
    ]);

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Promedio');
    expect(text).toContain('8');
    requests.verify();
  });

  it('keeps the subject usable when the promedio request fails', () => {
    open();
    requests.expectOne(`${environment.apiUrl}/api/materias/7`).flush({ id: 7, nombre: 'Física' });
    flushNotes();
    fixture.detectChanges();
    const reqs = requests.match(`${environment.apiUrl}/api/materias/7/evaluaciones`);
    for (const req of reqs) {
      req.flush({ message: 'sin servicio' }, { status: 500, statusText: 'Internal Server Error' });
    }
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Física');
    expect(text).toContain('Promedio:');
    requests.verify();
  });
});
