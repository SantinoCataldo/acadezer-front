import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { AdminService } from '@core/services/admin.service';
import { AdminStatsResponse } from '@core/models';

@Component({
  selector: 'app-admin-panel',
  imports: [RouterLink],
  templateUrl: './admin-panel.html',
})
export class AdminPanel implements OnInit {
  private auth = inject(AuthService);
  private adminService = inject(AdminService);

  usuario = this.auth.currentUser;
  estadisticas = signal<AdminStatsResponse | null>(null);
  cargandoEstadisticas = signal(true);
  errorEstadisticas = signal('');

  ngOnInit() {
    this.traerEstadisticas();
  }

  traerEstadisticas() {
    this.cargandoEstadisticas.set(true);
    this.errorEstadisticas.set('');
    this.adminService.getStats().subscribe({
      next: (data) => {
        this.estadisticas.set(data);
        this.cargandoEstadisticas.set(false);
      },
      error: (e) => {
        this.cargandoEstadisticas.set(false);
        this.errorEstadisticas.set('No se pudieron cargar las estadísticas');
      }
    })
  }


  tarjetas() {
    const e = this.estadisticas();
    if (!e) return [];
    return [
      { titulo: 'Usuarios', valor: e.usuarios, icono: 'group', detalle: e.usuariosHabilitados + ' habilitados' },
      { titulo: 'Estudiantes', valor: e.estudiantes, icono: 'school', detalle: e.administradores + ' administradores' },
      { titulo: 'Materias', valor: e.materias, icono: 'menu_book', detalle: '' },
      { titulo: 'Apuntes', valor: e.apuntes, icono: 'description', detalle: '' },
      { titulo: 'Tareas', valor: e.pendientes, icono: 'task_alt', detalle: '' },
      { titulo: 'Evaluaciones', valor: e.evaluaciones, icono: 'assignment', detalle: '' },
      { titulo: 'Asistencias', valor: e.asistencias, icono: 'event_available', detalle: '' },
    ];
  }
}
