import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type {
  AttendanceControlRequest,
  AttendanceControlResponse,
  AttendanceSummaryResponse,
  NumeroControlAsistencia,
  SubjectRequest,
  SubjectResponse,
} from '../models';

@Injectable({ providedIn: 'root' })
export class SubjectsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/materias`;

  list(): Observable<SubjectResponse[]> {
    return this.http.get<SubjectResponse[]>(this.baseUrl);
  }

  getById(id: number): Observable<SubjectResponse> {
    return this.http.get<SubjectResponse>(`${this.baseUrl}/${id}`);
  }

  create(request: SubjectRequest): Observable<SubjectResponse> {
    return this.http.post<SubjectResponse>(this.baseUrl, request);
  }

  update(id: number, request: SubjectRequest): Observable<SubjectResponse> {
    return this.http.put<SubjectResponse>(`${this.baseUrl}/${id}`, request);
  }

  finish(id: number): Observable<SubjectResponse> {
    return this.http.patch<SubjectResponse>(`${this.baseUrl}/${id}/finalizar`, null);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  attendanceControls(materiaId: number, desde: string, hasta: string): Observable<AttendanceControlResponse[]> {
    const params = new HttpParams().set('desde', desde).set('hasta', hasta);
    return this.http.get<AttendanceSummaryResponse | AttendanceControlResponse[]>(`${this.baseUrl}/${materiaId}/controles-asistencia`, { params }).pipe(
      map((response) => Array.isArray(response) ? response : response.controles),
    );
  }

  setAttendanceControl(
    materiaId: number,
    horarioId: number,
    fecha: string,
    numero: NumeroControlAsistencia,
    request: AttendanceControlRequest,
  ): Observable<AttendanceControlResponse> {
    return this.http.put<AttendanceControlResponse>(
      `${this.baseUrl}/${materiaId}/horarios/${horarioId}/controles/${fecha}/${numero}`,
      request,
    );
  }

  resetAttendanceControl(materiaId: number, horarioId: number, fecha: string, numero: 1 | 2): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${materiaId}/horarios/${horarioId}/controles/${fecha}/${numero}`,
    );
  }

  noClassDates(materiaId: number, desde: string, hasta: string): Observable<string[]> {
    const params = new HttpParams().set('desde', desde).set('hasta', hasta);
    return this.http.get<string[]>(`${this.baseUrl}/${materiaId}/fechas-sin-cursada`, { params });
  }

  excludeClassDate(materiaId: number, fecha: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${materiaId}/fechas-sin-cursada/${fecha}`, null);
  }

  includeClassDate(materiaId: number, fecha: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${materiaId}/fechas-sin-cursada/${fecha}`);
  }
}
