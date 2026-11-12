import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { AdminService } from '@core/services/admin.service';
import { AdminStatsResponse, UserResponse } from '@core/models';

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
  usuarios = signal<UserResponse[]>([]);
  cargandoUsuarios = signal(true);
  errorUsuarios = signal('');
  busqueda = signal('');

  ngOnInit() {
    this.traerEstadisticas();
    this.traerUsuarios();
  }

  traerUsuarios() {
    this.cargandoUsuarios.set(true);
    this.errorUsuarios.set('');
    this.adminService.getUsers().subscribe({
      next: (data) => {
        this.usuarios.set(data);
        this.cargandoUsuarios.set(false);
      },
      error: (e) => {
        this.cargandoUsuarios.set(false);
        this.errorUsuarios.set('No se pudieron cargar los usuarios');
      }
    })
  }

  buscar(texto: string) {
    this.busqueda.set(texto);
  }

  // puse para filtrar  nombre o mail,revisar dps
  usuariosFiltrados() {
    const texto = this.busqueda().trim().toLowerCase();
    if (!texto) return this.usuarios();
    return this.usuarios().filter((u) =>
      u.nombre.toLowerCase().includes(texto) || u.email.toLowerCase().includes(texto)
    );
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
