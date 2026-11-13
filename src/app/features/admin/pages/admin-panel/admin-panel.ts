import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { gsap } from 'gsap';
import { AuthService } from '@core/services/auth.service';
import { AdminService } from '@core/services/admin.service';
import type { AdminStatsResponse, UserResponse } from '@core/models';
import { Modal } from '../../../subjects/components/modal/modal';
import { TextField } from '@components/ui/text-field/text-field';
import { Select, type SelectOption } from '@components/ui/select/select';

export type UserFilterTab = 'all' | 'students' | 'admins' | 'active' | 'suspended';
export type UserSortOption = 'nombre-asc' | 'nombre-desc' | 'recientes' | 'antiguos';

@Component({
  selector: 'app-admin-panel',
  imports: [Modal, TextField, Select, FormsModule],
  templateUrl: './admin-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPanel implements OnInit, AfterViewInit {
  private readonly auth = inject(AuthService);
  private readonly adminService = inject(AdminService);
  private readonly router = inject(Router);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  private isNavigating = false;

  readonly usuario = this.auth.currentUser;
  readonly estadisticas = signal<AdminStatsResponse | null>(null);
  readonly cargandoEstadisticas = signal(true);
  readonly errorEstadisticas = signal('');

  readonly usuarios = signal<UserResponse[]>([]);
  readonly cargandoUsuarios = signal(true);
  readonly errorUsuarios = signal('');

  readonly busqueda = signal('');
  readonly activeTab = signal<UserFilterTab>('all');
  readonly ordenUsuarios = signal<UserSortOption>('nombre-asc');
  readonly procesando = signal<number | null>(null);
  readonly errorAccion = signal('');
  readonly mensajeExito = signal('');

  // Modal para suspender cuenta
  readonly modalSuspender = signal<UserResponse | null>(null);
  readonly suspendiendo = signal(false);

  // Modal para ficha/detalle de usuario
  readonly modalDetalle = signal<UserResponse | null>(null);
  readonly copiadoId = signal(false);

  // Totales para los filtros
  readonly totalUsuarios = computed(() => this.usuarios().length);
  readonly totalEstudiantes = computed(
    () => this.usuarios().filter((u) => u.role !== 'ADMIN').length,
  );
  readonly totalAdmins = computed(() => this.usuarios().filter((u) => u.role === 'ADMIN').length);
  readonly totalHabilitados = computed(() => this.usuarios().filter((u) => u.enabled).length);
  readonly totalSuspendidos = computed(() => this.usuarios().filter((u) => !u.enabled).length);

  // Opciones dinámicas para el select de filtros
  readonly opcionesFiltro = computed<SelectOption<UserFilterTab>[]>(() => [
    { value: 'all', label: `Todos (${this.totalUsuarios()})` },
    { value: 'students', label: `Estudiantes (${this.totalEstudiantes()})` },
    { value: 'admins', label: `Administradores (${this.totalAdmins()})` },
    { value: 'active', label: `Habilitados (${this.totalHabilitados()})` },
    { value: 'suspended', label: `Suspendidos (${this.totalSuspendidos()})` },
  ]);

  // Opciones fijas para el select de ordenamiento
  readonly opcionesOrden: SelectOption<UserSortOption>[] = [
    { value: 'nombre-asc', label: 'Nombre: A → Z' },
    { value: 'nombre-desc', label: 'Nombre: Z → A' },
    { value: 'recientes', label: 'Más recientes (ID)' },
    { value: 'antiguos', label: 'Más antiguos (ID)' },
  ];

  // Métricas avanzadas / analítica de la plataforma
  readonly tasaHabilitados = computed(() => {
    const e = this.estadisticas();
    if (!e || e.usuarios === 0) return 100;
    return Math.round((e.usuariosHabilitados / e.usuarios) * 100);
  });

  readonly promedioApuntesPorEstudiante = computed(() => {
    const e = this.estadisticas();
    if (!e || e.estudiantes === 0) return '0.0';
    return (e.apuntes / e.estudiantes).toFixed(1);
  });

  readonly promedioMateriasPorEstudiante = computed(() => {
    const e = this.estadisticas();
    if (!e || e.estudiantes === 0) return '0.0';
    return (e.materias / e.estudiantes).toFixed(1);
  });

  readonly totalRecursosGenerados = computed(() => {
    const e = this.estadisticas();
    if (!e) return 0;
    return e.materias + e.apuntes + e.pendientes + e.evaluaciones + e.asistencias;
  });

  // Lista filtrada y ordenada en tiempo real
  readonly usuariosFiltrados = computed(() => {
    let list = [...this.usuarios()];
    const tab = this.activeTab();

    if (tab === 'students') {
      list = list.filter((u) => u.role !== 'ADMIN');
    } else if (tab === 'admins') {
      list = list.filter((u) => u.role === 'ADMIN');
    } else if (tab === 'active') {
      list = list.filter((u) => u.enabled);
    } else if (tab === 'suspended') {
      list = list.filter((u) => !u.enabled);
    }

    const texto = this.busqueda().trim().toLowerCase();
    if (texto) {
      list = list.filter(
        (u) => u.nombre.toLowerCase().includes(texto) || u.email.toLowerCase().includes(texto),
      );
    }

    const orden = this.ordenUsuarios();
    if (orden === 'nombre-asc') {
      list.sort((a, b) => a.nombre.localeCompare(b.nombre));
    } else if (orden === 'nombre-desc') {
      list.sort((a, b) => b.nombre.localeCompare(a.nombre));
    } else if (orden === 'recientes') {
      list.sort((a, b) => b.id - a.id);
    } else if (orden === 'antiguos') {
      list.sort((a, b) => a.id - b.id);
    }

    return list;
  });

  readonly tarjetas = computed(() => {
    const e = this.estadisticas();
    if (!e) return [];
    return [
      {
        titulo: 'Usuarios',
        valor: e.usuarios,
        icono: 'group',
        detalle: `${e.usuariosHabilitados} habilitados`,
        subdetalle: `${e.usuarios - e.usuariosHabilitados} suspendidos`,
        destacada: true,
      },
      {
        titulo: 'Estudiantes',
        valor: e.estudiantes,
        icono: 'school',
        detalle: `${e.administradores} administradores`,
        subdetalle: '',
        destacada: true,
      },
      {
        titulo: 'Materias',
        valor: e.materias,
        icono: 'menu_book',
        detalle: 'Creadas en total',
        subdetalle: '',
        destacada: false,
      },
      {
        titulo: 'Apuntes',
        valor: e.apuntes,
        icono: 'description',
        detalle: 'Notas registradas',
        subdetalle: '',
        destacada: false,
      },
      {
        titulo: 'Tareas',
        valor: e.pendientes,
        icono: 'task_alt',
        detalle: 'Pendientes activos',
        subdetalle: '',
        destacada: false,
      },
      {
        titulo: 'Evaluaciones',
        valor: e.evaluaciones,
        icono: 'assignment',
        detalle: 'Fechas y notas',
        subdetalle: '',
        destacada: false,
      },
      {
        titulo: 'Asistencias',
        valor: e.asistencias,
        icono: 'event_available',
        detalle: 'Registros de cursada',
        subdetalle: '',
        destacada: false,
      },
    ];
  });

  ngOnInit(): void {
    this.traerEstadisticas();
    this.traerUsuarios();
  }

  ngAfterViewInit(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    gsap.fromTo(
      '[data-reveal]',
      { autoAlpha: 0, y: 12, filter: 'blur(6px)' },
      {
        autoAlpha: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: 0.36,
        stagger: 0.05,
        ease: 'power2.out',
        clearProps: 'filter,transform,willChange',
      },
    );
  }

  cerrarSesion(): void {
    if (this.isNavigating) return;
    this.isNavigating = true;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.auth.logout();
      return;
    }

    const host = this.elementRef.nativeElement;
    gsap.to(host, {
      autoAlpha: 0,
      y: -8,
      filter: 'blur(5px)',
      duration: 0.22,
      ease: 'power2.in',
      onComplete: () => {
        this.auth.logout();
      },
    });
  }

  refrescarTodo(): void {
    this.traerEstadisticas();
    this.traerUsuarios();
  }

  traerEstadisticas(): void {
    this.cargandoEstadisticas.set(true);
    this.errorEstadisticas.set('');
    this.adminService
      .getStats()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.estadisticas.set(data);
          this.cargandoEstadisticas.set(false);
        },
        error: () => {
          this.cargandoEstadisticas.set(false);
          this.errorEstadisticas.set('No se pudieron cargar las estadísticas.');
        },
      });
  }

  traerUsuarios(): void {
    this.cargandoUsuarios.set(true);
    this.errorUsuarios.set('');
    this.adminService
      .getUsers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.usuarios.set(data);
          this.cargandoUsuarios.set(false);
        },
        error: () => {
          this.cargandoUsuarios.set(false);
          this.errorUsuarios.set('No se pudieron cargar los usuarios.');
        },
      });
  }

  buscar(texto: string): void {
    this.busqueda.set(texto);
  }

  limpiarBusqueda(): void {
    this.busqueda.set('');
  }

  setTab(tab: UserFilterTab): void {
    this.activeTab.set(tab);
  }

  abrirConfirmacionSuspender(u: UserResponse): void {
    if (u.role === 'ADMIN') return;
    this.modalSuspender.set(u);
  }

  cerrarModalSuspender(): void {
    if (this.suspendiendo()) return;
    this.modalSuspender.set(null);
  }

  confirmarSuspension(): void {
    const u = this.modalSuspender();
    if (!u) return;

    this.suspendiendo.set(true);
    this.errorAccion.set('');

    this.adminService
      .setEnabled(u.id, false)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (actualizado) => {
          this.usuarios.update((list) =>
            list.map((x) => (x.id === actualizado.id ? actualizado : x)),
          );
          this.suspendiendo.set(false);
          this.modalSuspender.set(null);
          this.traerEstadisticas();
          this.mostrarMensajeExito(`Cuenta de ${u.nombre} suspendida correctamente.`);
        },
        error: () => {
          this.suspendiendo.set(false);
          this.errorAccion.set(`No se pudo suspender la cuenta de ${u.nombre}.`);
        },
      });
  }

  habilitarCuenta(u: UserResponse): void {
    this.procesando.set(u.id);
    this.errorAccion.set('');

    this.adminService
      .setEnabled(u.id, true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (actualizado) => {
          this.usuarios.update((list) =>
            list.map((x) => (x.id === actualizado.id ? actualizado : x)),
          );
          this.procesando.set(null);
          this.traerEstadisticas();
          this.mostrarMensajeExito(`Cuenta de ${u.nombre} habilitada correctamente.`);
        },
        error: () => {
          this.procesando.set(null);
          this.errorAccion.set(`No se pudo habilitar la cuenta de ${u.nombre}.`);
        },
      });
  }

  private mostrarMensajeExito(msg: string): void {
    this.mensajeExito.set(msg);
    setTimeout(() => {
      if (this.mensajeExito() === msg) {
        this.mensajeExito.set('');
      }
    }, 4000);
  }

  abrirDetalle(u: UserResponse): void {
    this.modalDetalle.set(u);
    this.copiadoId.set(false);
  }

  cerrarDetalle(): void {
    this.modalDetalle.set(null);
    this.copiadoId.set(false);
  }

  async copiarIdUsuario(id: number): Promise<void> {
    try {
      await navigator.clipboard.writeText(String(id));
      this.copiadoId.set(true);
      setTimeout(() => this.copiadoId.set(false), 2000);
    } catch {
      // Si el navegador bloquea clipboard, no falla silenciosamente
    }
  }

  exportarUsuariosCsv(): void {
    const lista = this.usuariosFiltrados();
    if (lista.length === 0) return;

    const encabezados = ['ID', 'Nombre', 'Email', 'Rol', 'Estado'];
    const filas = lista.map((u) => [
      u.id,
      `"${u.nombre.replace(/"/g, '""')}"`,
      `"${u.email.replace(/"/g, '""')}"`,
      u.role === 'ADMIN' ? 'Administrador' : 'Estudiante',
      u.enabled ? 'Habilitada' : 'Suspendida',
    ]);

    const contenido = [encabezados.join(','), ...filas.map((f) => f.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `usuarios_acadezer_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.mostrarMensajeExito(`Exportados ${lista.length} usuarios a CSV.`);
  }

  userInitial(nombre: string): string {
    const trimmed = nombre.trim();
    return Array.from(trimmed)[0]?.toUpperCase() ?? 'U';
  }
}

