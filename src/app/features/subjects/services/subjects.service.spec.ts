import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import type { SubjectRequest, SubjectResponse } from '../models';
import { SubjectsService } from './subjects.service';

describe('SubjectsService', () => {
  let requests: HttpTestingController;
  let service: SubjectsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SubjectsService);
    requests = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    requests.verify();
    TestBed.resetTestingModule();
  });

  it('lists the subjects of the authenticated user', () => {
    const subjects: SubjectResponse[] = [
      { id: 1, nombre: 'Análisis matemático', descripcion: null },
      { id: 2, nombre: 'Algoritmos', descripcion: 'Primer año' },
    ];
    let received: SubjectResponse[] = [];

    service.list().subscribe((value) => (received = value));

    requests.expectOne(`${environment.apiUrl}/api/materias`).flush(subjects);
    expect(received).toEqual(subjects);
  });

  it('requests one subject by id without trusting a client sent owner', () => {
    const subject: SubjectResponse = { id: 7, nombre: 'Física', descripcion: null };
    let received: SubjectResponse | null = null;

    service.getById(7).subscribe((value) => (received = value));

    requests.expectOne(`${environment.apiUrl}/api/materias/7`).flush(subject);
    expect(received).toEqual(subject);
  });

  it('creates a subject sending the request body untouched', () => {
    const request: SubjectRequest = { nombre: 'Química', descripcion: null };
    let received: SubjectResponse | null = null;

    service.create(request).subscribe((value) => (received = value));

    const httpRequest = requests.expectOne(`${environment.apiUrl}/api/materias`);
    expect(httpRequest.request.method).toBe('POST');
    expect(httpRequest.request.body).toEqual(request);
    httpRequest.flush({ id: 3, nombre: 'Química', descripcion: null });
    expect(received).toEqual({ id: 3, nombre: 'Química', descripcion: null });
  });

  it('updates a subject with PUT on its own url', () => {
    service.update(7, { nombre: 'Física II', descripcion: 'Segundo cuatrimestre' }).subscribe();

    const httpRequest = requests.expectOne(`${environment.apiUrl}/api/materias/7`);
    expect(httpRequest.request.method).toBe('PUT');
    expect(httpRequest.request.body).toEqual({ nombre: 'Física II', descripcion: 'Segundo cuatrimestre' });
    httpRequest.flush({ id: 7, nombre: 'Física II', descripcion: 'Segundo cuatrimestre' });
  });

  it('deletes a subject and completes with the empty 204 response', () => {
    let completed = false;

    service.delete(7).subscribe({ complete: () => (completed = true) });

    requests.expectOne(`${environment.apiUrl}/api/materias/7`).flush(null, { status: 204, statusText: 'No Content' });
    expect(completed).toBe(true);
  });
});
