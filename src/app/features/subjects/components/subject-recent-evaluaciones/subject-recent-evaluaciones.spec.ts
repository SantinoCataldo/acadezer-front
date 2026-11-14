import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { environment } from '../../../../../environments/environment';
import { SubjectRecentEvaluaciones } from './subject-recent-evaluaciones';

@Component({ selector: 'app-route-stub', template: '' })
class RouteStub {}

describe('SubjectRecentEvaluaciones', () => {
  let requests: HttpTestingController;
  let fixture: ComponentFixture<SubjectRecentEvaluaciones>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SubjectRecentEvaluaciones],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'estudio/evaluaciones', component: RouteStub }]),
      ],
    });
    requests = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SubjectRecentEvaluaciones);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('shows up to 3 evaluations for that subject', () => {
    fixture.componentRef.setInput('materiaId', 7);
    fixture.detectChanges();

    const request = requests.expectOne(`${environment.apiUrl}/api/materias/7/evaluaciones`);
    request.flush([
      { id: 1, nombre: 'Parcial 1', fecha: '2026-10-01', calificacion: 8, materiaId: 7 },
      { id: 2, nombre: 'Parcial 2', fecha: '2026-11-01', calificacion: 4, materiaId: 7 },
      { id: 3, nombre: 'Final', fecha: '2026-12-01', calificacion: null, materiaId: 7 },
      { id: 4, nombre: 'Extra', fecha: '2026-09-01', calificacion: 10, materiaId: 7 },
    ]);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Final');
    expect(text).toContain('Parcial 2');
    expect(text).toContain('Parcial 1');
    expect(text).not.toContain('Extra');
    expect(text).toContain('8 / 10');
    expect(text).toContain('4 / 10');
    expect(text).toContain('Pendiente');
    requests.verify();
  });

  it('shows empty state when subject has no evaluations', () => {
    fixture.componentRef.setInput('materiaId', 7);
    fixture.detectChanges();

    requests.expectOne(`${environment.apiUrl}/api/materias/7/evaluaciones`).flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Todavía no hay evaluaciones en esta materia.');
    requests.verify();
  });
});

