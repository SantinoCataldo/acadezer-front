import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import { NotesService } from './notes.service';

describe('NotesService', () => {
  let requests: HttpTestingController;
  let service: NotesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), NotesService],
    });
    requests = TestBed.inject(HttpTestingController);
    service = TestBed.inject(NotesService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('lists the notes of one subject under materiaId', () => {
    service.list(7).subscribe();

    const request = requests.expectOne(`${environment.apiUrl}/api/materias/7/apuntes`);
    expect(request.request.method).toBe('GET');
    request.flush([]);
    requests.verify();
  });

  it('creates a note for that subject and sends the trimmed title with content', () => {
    service.create(7, { titulo: '  Variables  ', contenido: '<p>Tipos</p>' }).subscribe();

    const request = requests.expectOne(`${environment.apiUrl}/api/materias/7/apuntes`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ titulo: '  Variables  ', contenido: '<p>Tipos</p>' });
    request.flush({ id: 3, titulo: 'Variables', contenido: '<p>Tipos</p>', materiaId: 7 });
    requests.verify();
  });

  it('updates and deletes by note id', () => {
    // Las dos peticiones salen juntas: `match` devuelve las dos y se responden en
    // orden, sin depender de en qué momento el backend de prueba las recibe.
    service.update(3, { titulo: 'Variables y tipos', contenido: '<p>Tipos</p>' }).subscribe();
    service.delete(3).subscribe();

    const pending = requests.match(`${environment.apiUrl}/api/apuntes/3`);
    expect(pending).toHaveLength(2);
    expect(pending[0].request.method).toBe('PUT');
    const saved = { id: 3, titulo: 'Variables y tipos', contenido: '<p>Tipos</p>', materiaId: 7 };
    pending[0].flush(saved);
    expect(pending[1].request.method).toBe('DELETE');
    pending[1].flush(null, { status: 204, statusText: 'No Content' });
    requests.verify();
  });

  it('reads one note from its own endpoint', () => {
    service.getById(3).subscribe();

    const request = requests.expectOne(`${environment.apiUrl}/api/apuntes/3`);
    expect(request.request.method).toBe('GET');
    request.flush({ id: 3, titulo: 'Variables', contenido: '<p>Tipos</p>', materiaId: 7 });
    requests.verify();
  });

  it('requests practice questions generated with AI for a note', () => {
    const mockResponse = {
      preguntas: [
        { pregunta: '¿Qué es una variable?', respuesta: 'Un espacio en memoria.' },
      ],
    };
    service.generatePracticeQuestions(3).subscribe((res) => {
      expect(res.preguntas).toEqual(mockResponse.preguntas);
    });

    const request = requests.expectOne(`${environment.apiUrl}/api/apuntes/3/preguntas`);
    expect(request.request.method).toBe('POST');
    request.flush(mockResponse);
    requests.verify();
  });
});
