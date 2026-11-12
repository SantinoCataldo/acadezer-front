import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import type { EvaluacionRequest, EvaluacionResponse } from './models';

@Injectable({ providedIn: 'root' })
export class EvaluacionService {
  private readonly http = inject(HttpClient);
  private readonly materiasUrl = `${environment.apiUrl}/api/materias`;
  private readonly evaluacionesUrl = `${environment.apiUrl}/api/evaluaciones`;

  listByMateria(materiaId: number) {
    return this.http.get<EvaluacionResponse[]>(`${this.materiasUrl}/${materiaId}/evaluaciones`);
  }

  getById(id: number) {
    return this.http.get<EvaluacionResponse>(`${this.evaluacionesUrl}/${id}`);
  }

  create(materiaId: number, request: EvaluacionRequest) {
    return this.http.post<EvaluacionResponse>(`${this.materiasUrl}/${materiaId}/evaluaciones`, request);
  }

  update(id: number, request: EvaluacionRequest) {
    return this.http.put<EvaluacionResponse>(`${this.evaluacionesUrl}/${id}`, request);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.evaluacionesUrl}/${id}`);
  }
}
