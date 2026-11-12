import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
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
  private destroyRef = inject(DestroyRef);

  materias = signal<SubjectResponse[]>([]);
  tareas = signal<Tarea[]>([]);
  proximas = signal<Tarea[]>([]);
  materiaId = signal<number | null>(null);
  cargando = signal(true);
  error = signal('');
  proximasCargando = signal(false);
  proximasError = signal('');
  accionError = signal('');
  tareasEnProceso = signal<ReadonlySet<number>>(new Set());

  ngOnInit() {
    this.traerMaterias();
    this.traerProximas();
  }

  traerProximas(): void {
    if (this.proximasCargando()) return;

    this.proximasCargando.set(true);
    this.proximasError.set('');
    const hoy = new Date();
    const enUnaSemana = new Date();
    enUnaSemana.setDate(hoy.getDate() + 7);

    this.tareaService.getProximas(this.formatearFecha(hoy), this.formatearFecha(enUnaSemana))
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.proximasCargando.set(false)))
      .subscribe({
      next: (data) => {
        this.proximas.set(data);
      },
      error: () => {
        this.proximasError.set('No se pudieron cargar las próximas tareas. Podés reintentar.');
      },
    });
  }


  formatearFecha(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return anio + '-' + mes + '-' + dia;
  }

  nombreMateria(id: number): string {
    const materia = this.materias().find((m) => m.id === id);
    return materia ? materia.nombre : '';
  }

  traerMaterias(): void {
    this.cargando.set(true);
    this.error.set('');
    this.materiaService.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
      error: () => {
        this.cargando.set(false);
        this.error.set('No se pudieron cargar las materias. Revisá tu conexión e intentá nuevamente.');
      }
    });
  }

  elegirMateria(id: number): void {
    this.materiaId.set(id);
    this.traerTareas(id);
  }

  cambiarMateria(valor: string): void {
    this.elegirMateria(Number(valor));
  }

  traerTareas(materiaId: number): void {
    this.cargando.set(true);
    this.error.set('');
    this.tareaService.getTareas(materiaId).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.cargando.set(false)),
    ).subscribe({
      next: (data) => {
        this.tareas.set(data);
      },
      error: () => {
        this.error.set('No se pudieron cargar las tareas. Revisá tu conexión e intentá nuevamente.');
      }
    });
  }

  reintentarCarga(): void {
    const id = this.materiaId();
    if (id === null) this.traerMaterias();
    else this.traerTareas(id);
  }

  marcarCompletada(t: Tarea): void {
    if (this.tareasEnProceso().has(t.id)) return;
    this.accionError.set('');
    this.marcarEnProceso(t.id, true);

    this.tareaService.cambiarCompletado(t.id, !t.completado)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.marcarEnProceso(t.id, false)),
      )
      .subscribe({
      next: () => {
        this.traerTareas(t.materiaId);
        this.traerProximas();
      },
      error: () => {
        this.accionError.set('No se pudo actualizar la tarea. Revisá tu conexión e intentá nuevamente.');
      },
    });
  }

  eliminar(t: Tarea): void {
    if (this.tareasEnProceso().has(t.id)) return;
    if (!confirm('¿Seguro que querés eliminar la tarea "' + t.titulo + '"?')) {
      return;
    }

    this.accionError.set('');
    this.marcarEnProceso(t.id, true);
    this.tareaService.eliminarTarea(t.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.marcarEnProceso(t.id, false)),
      )
      .subscribe({
      next: () => {
        this.traerTareas(t.materiaId);
        this.traerProximas();
      },
      error: () => {
        this.accionError.set('No se pudo eliminar la tarea. Revisá tu conexión e intentá nuevamente.');
      },
    });
  }

  estaEnProceso(id: number): boolean {
    return this.tareasEnProceso().has(id);
  }

  private marcarEnProceso(id: number, enProceso: boolean): void {
    this.tareasEnProceso.update((current) => {
      const next = new Set(current);
      if (enProceso) next.add(id);
      else next.delete(id);
      return next;
    });
  }
}
