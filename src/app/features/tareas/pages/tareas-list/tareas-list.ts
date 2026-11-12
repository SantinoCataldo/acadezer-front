import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SubjectsService } from '../../../subjects/services/subjects.service';
import { SubjectResponse } from '../../../subjects/models';
import { TareaService } from '../../tarea-service';
import { Tarea } from '../../tarea';

@Component({
  selector: 'app-tareas-list',
  imports: [RouterLink],
  templateUrl: './tareas-list.html',
})
export class TareasList implements OnInit {
  private materiaService = inject(SubjectsService);
  private tareaService = inject(TareaService);
  private route = inject(ActivatedRoute);

  materias = signal<SubjectResponse[]>([]);
  tareas = signal<Tarea[]>([]);
  materiaId = signal<number | null>(null);
  cargando = signal(true);
  error = signal('');

  ngOnInit() {
    this.traerMaterias();
  }

  traerMaterias() {
    this.materiaService.list().subscribe({
      next: (data) => {
        this.materias.set(data);
        this.cargando.set(false);
        const materiaDeLaUrl = this.route.snapshot.queryParamMap.get('materia');
        if (materiaDeLaUrl) {
          this.elegirMateria(Number(materiaDeLaUrl));
        } else if (data.length > 0) {
          this.elegirMateria(data[0].id);
        }
      },
      error: (e) => {
        this.cargando.set(false);
        this.error.set('No se pudieron cargar las materias');
      }
    })
  }

  elegirMateria(id: number) {
    this.materiaId.set(id);
    this.traerTareas(id);
  }

  cambiarMateria(valor: string) {
    this.elegirMateria(Number(valor));
  }

  traerTareas(materiaId: number) {
    this.cargando.set(true);
    this.error.set('');
    this.tareaService.getTareas(materiaId).subscribe({
      next: (data) => {
        this.tareas.set(data);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.error.set('No se pudieron cargar las tareas');
      }
    })
  }

  marcarCompletada(t: Tarea) {
    this.tareaService.cambiarCompletado(t.id, !t.completado).subscribe({
      next: () => {
        this.traerTareas(t.materiaId);
      },
      error: (e) => {
        alert('Error al actualizar la tarea');
        this.traerTareas(t.materiaId);
      }
    })
  }

  eliminar(t: Tarea) {
    if (!confirm('¿Seguro que querés eliminar la tarea "' + t.titulo + '"?')) {
      return;
    }

    this.tareaService.eliminarTarea(t.id).subscribe({
      next: () => {
        this.traerTareas(t.materiaId);
      },
      error: (e) => {
        alert('Error al eliminar la tarea');
      }
    })
  }
}
