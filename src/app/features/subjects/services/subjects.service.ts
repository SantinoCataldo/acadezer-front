import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { SubjectRequest, SubjectResponse } from '../models';

/**
 * Acceso HTTP a /api/materias.
 *
 * El interceptor de autorización existente adjunta el Bearer y refresa la
 * sesión: este servicio no conoce tokens ni cabeceras. El borrado devuelve
 * 204 sin cuerpo, por eso se tipa como Observable<void>.
 */
@Injectable({ providedIn: 'root' })
export class SubjectsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/materias`;

  /** Materias del usuario autenticado; sin paginación en el contrato actual. */
  list(): Observable<SubjectResponse[]> {
    return this.http.get<SubjectResponse[]>(this.baseUrl);
  }

  /** Una materia propia. Un recurso ajeno responde 404. */
  getById(id: number): Observable<SubjectResponse> {
    return this.http.get<SubjectResponse>(`${this.baseUrl}/${id}`);
  }

  create(request: SubjectRequest): Observable<SubjectResponse> {
    return this.http.post<SubjectResponse>(this.baseUrl, request);
  }

  update(id: number, request: SubjectRequest): Observable<SubjectResponse> {
    return this.http.put<SubjectResponse>(`${this.baseUrl}/${id}`, request);
  }

  /** 204 sin cuerpo. El backend borra en cascada apuntes, pendientes, evaluaciones y asistencias. */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
