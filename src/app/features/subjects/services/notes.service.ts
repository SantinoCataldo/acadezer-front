import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { NoteRequest, NoteResponse, PracticeQuestionsResponse } from '../models';

/**
 * APU-01: CRUD de apuntes de una materia.
 *
 * El contrato lo expone el backend en `/api/materias/{materiaId}/apuntes` para
 * listar y crear, y en `/api/apuntes/{id}` para leer, editar y borrar. Todas las
 * rutas validan dueño: un apunte de otra materia responde 404.
 */
@Injectable({ providedIn: 'root' })
export class NotesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/materias`;

  list(materiaId: number): Observable<NoteResponse[]> {
    return this.http.get<NoteResponse[]>(`${this.baseUrl}/${materiaId}/apuntes`);
  }

  getById(id: number): Observable<NoteResponse> {
    return this.http.get<NoteResponse>(`${environment.apiUrl}/api/apuntes/${id}`);
  }

  create(materiaId: number, request: NoteRequest): Observable<NoteResponse> {
    return this.http.post<NoteResponse>(`${this.baseUrl}/${materiaId}/apuntes`, request);
  }

  update(id: number, request: NoteRequest): Observable<NoteResponse> {
    return this.http.put<NoteResponse>(`${environment.apiUrl}/api/apuntes/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/apuntes/${id}`);
  }

  generatePracticeQuestions(id: number): Observable<PracticeQuestionsResponse> {
    return this.http.post<PracticeQuestionsResponse>(`${environment.apiUrl}/api/apuntes/${id}/preguntas`, {});
  }
}
