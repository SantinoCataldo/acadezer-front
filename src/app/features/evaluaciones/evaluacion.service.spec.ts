import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { EvaluacionService } from './evaluacion.service';
import type { EvaluacionRequest, EvaluacionResponse } from './models';

describe('EvaluacionService', () => {
  let requests: HttpTestingController;
  let service: EvaluacionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), EvaluacionService],
    });
    requests = TestBed.inject(HttpTestingController);
    service = TestBed.inject(EvaluacionService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  const evaluacion: EvaluacionRequest = {
    nombre: 'Primer parcial',
    fecha: '2026-11-10',
    calificacion: 7.25,
  };

  const guardada: EvaluacionResponse = { id: 3, ...evaluacion, calificacion: evaluacion.calificacion ?? null, materiaId: 7 };

  it('lists the exams of one subject under materiaId', () => {
    service.listByMateria(7).subscribe();

    const request = requests.expectOne(`${environment.apiUrl}/api/materias/7/evaluaciones`);
    expect(request.request.method).toBe('GET');
    request.flush([guardada]);
    requests.verify();
  });

  it('creates an exam for that subject and sends every field', () => {
    service.create(7, evaluacion).subscribe();

    const request = requests.expectOne(`${environment.apiUrl}/api/materias/7/evaluaciones`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(evaluacion);
    request.flush(guardada);
    requests.verify();
  });

  it('updates and deletes by exam id', () => {
    service.update(3, evaluacion).subscribe();
    service.delete(3).subscribe();

    const pending = requests.match(`${environment.apiUrl}/api/evaluaciones/3`);
    expect(pending).toHaveLength(2);
    expect(pending[0].request.method).toBe('PUT');
    pending[0].flush(guardada);
    expect(pending[1].request.method).toBe('DELETE');
    pending[1].flush(null, { status: 204, statusText: 'No Content' });
    requests.verify();
  });
});
