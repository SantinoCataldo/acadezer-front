import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Tarea, TareaRequest } from './tarea';

@Injectable({
  providedIn: 'root',
})
export class TareaService {
  private http = inject(HttpClient);
  readonly API_URL = environment.apiUrl + '/api/pendientes';
  readonly MATERIAS_URL = environment.apiUrl + '/api/materias';

  getTareas(materiaId: number) {
    return this.http.get<Tarea[]>(this.MATERIAS_URL + '/' + materiaId + '/pendientes');
  }

  getTarea(id: number) {
    return this.http.get<Tarea>(this.API_URL + '/' + id);
  }

  crearTarea(materiaId: number, tarea: TareaRequest) {
    return this.http.post<Tarea>(this.MATERIAS_URL + '/' + materiaId + '/pendientes', tarea);
  }

  editarTarea(id: number, tarea: TareaRequest) {
    return this.http.put<Tarea>(this.API_URL + '/' + id, tarea);
  }

  eliminarTarea(id: number) {
    return this.http.delete<void>(this.API_URL + '/' + id);
  }

  cambiarCompletado(id: number, completado: boolean) {
    return this.http.patch<Tarea>(this.API_URL + '/' + id + '/completado', { completado: completado });
  }

  getProximas(desde: string, hasta: string) {
    return this.http.get<Tarea[]>(this.API_URL + '/proximos?desde=' + desde + '&hasta=' + hasta);
  }
}
