import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { SubjectsService } from '../../../subjects/services/subjects.service';
import { SubjectResponse } from '../../../subjects/models';
import { Modal } from '../../../subjects/components/modal/modal';
import { TextField } from '../../../../components/ui/text-field/text-field';
import { DatePicker } from '../../../../components/ui/date-picker/date-picker';
import { Select, SelectOption } from '../../../../components/ui/select/select';
import { Tarea, TareaRequest } from '../../tarea';
import { TareaService } from '../../tarea-service';

@Component({
  selector: 'app-tareas-list',
  imports: [ReactiveFormsModule, RouterLink, Modal, TextField, DatePicker, Select],
  templateUrl: './tareas-list.html',
  styleUrl: './tareas-list.css',
})
export class TareasList implements OnInit {
  private readonly materiaService = inject(SubjectsService);
  private readonly tareaService = inject(TareaService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly materias = signal<SubjectResponse[]>([]);
  readonly materiasSelectOptions = computed<readonly SelectOption<number>[]>(() =>
    this.materias().map((m) => ({
      value: m.id,
      label: m.nombre,
    })),
  );
  readonly tareas = signal<Tarea[]>([]);
  readonly materiasExcluidas = signal<ReadonlySet<number>>(new Set());

  readonly hayFiltrosActivos = computed(
    () => this.materiasExcluidas().size > 0,
  );

  readonly tareasFiltradas = computed(() => {
    let lista = this.tareas();
    const excluidas = this.materiasExcluidas();
    if (excluidas.size > 0) {
      lista = lista.filter((t) => !excluidas.has(t.materiaId));
    }

    return [...lista].sort((a, b) => this.ordenarTareas(a, b));
  });

  readonly pendientes = computed(() =>
    this.tareasFiltradas().filter((task) => !task.completado),
  );
  readonly completadas = computed(() =>
    this.tareasFiltradas().filter((task) => task.completado),
  );

  readonly cargando = signal(true);
  readonly error = signal('');
  readonly accionError = signal('');
  readonly modalAbierto = signal(false);
  readonly ayudaAbierta = signal(false);
  readonly guardando = signal(false);
  readonly tareaEditando = signal<Tarea | null>(null);
  readonly tareaAEliminar = signal<Tarea | null>(null);
  readonly errorEliminar = signal('');
  readonly tareaArrastrada = signal<number | null>(null);
  readonly tareasEnProceso = signal<ReadonlySet<number>>(new Set());

  readonly form = new FormGroup({
    materiaId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    titulo: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200)] }),
    descripcion: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(2000)] }),
    fechaLimite: new FormControl<string | null>(null),
  });

  constructor() {
    this.cargarTablero();
  }

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const materiaParam = params.get('materiaId') ?? params.get('materia');
      if (materiaParam) {
        const id = Number(materiaParam);
        if (!isNaN(id) && id > 0) {
          const otherIds = this.materias().map((m) => m.id).filter((mId) => mId !== id);
          if (otherIds.length > 0) {
            this.materiasExcluidas.set(new Set(otherIds));
          }
        }
      }
    });
  }

  cargarTablero(): void {
    this.cargando.set(true);
    this.error.set('');
    this.materiaService.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (materias) => {
        this.materias.set(materias);
        if (materias.length === 0) {
          this.tareas.set([]);
          this.cargando.set(false);
          return;
        }

        const param = this.route.snapshot.queryParamMap.get('materiaId') ?? this.route.snapshot.queryParamMap.get('materia');
        if (param) {
          const id = Number(param);
          if (!isNaN(id) && id > 0) {
            const otherIds = materias.map((m) => m.id).filter((mId) => mId !== id);
            if (otherIds.length > 0) {
              this.materiasExcluidas.set(new Set(otherIds));
            }
          }
        }

        forkJoin(materias.map((materia) => this.tareaService.getTareas(materia.id)))
          .pipe(
            takeUntilDestroyed(this.destroyRef),
            finalize(() => this.cargando.set(false)),
          )
          .subscribe({
            next: (listas) => this.tareas.set(listas.flat().sort((a, b) => this.ordenarTareas(a, b))),
            error: () => this.error.set('No se pudieron cargar las tareas. Revisá tu conexión e intentá nuevamente.'),
          });
      },
      error: () => {
        this.cargando.set(false);
        this.error.set('No se pudieron cargar las materias. Revisá tu conexión e intentá nuevamente.');
      },
    });
  }

  abrirModal(tarea?: Tarea): void {
    if (this.materias().length === 0) return;
    this.accionError.set('');

    if (tarea) {
      this.tareaEditando.set(tarea);
      this.form.reset({
        materiaId: tarea.materiaId,
        titulo: tarea.titulo,
        descripcion: tarea.descripcion ?? '',
        fechaLimite: tarea.fechaLimite ?? null,
      });
    } else {
      this.tareaEditando.set(null);
      const activas = this.materias().filter((m) => this.materiaActiva(m.id));
      const defaultMateria = activas.length === 1 ? activas[0].id : this.materias()[0].id;
      this.form.reset({
        materiaId: defaultMateria,
        titulo: '',
        descripcion: '',
        fechaLimite: null,
      });
    }

    this.modalAbierto.set(true);
  }

  tituloError(): string | null {
    const control = this.form.controls.titulo;
    if (!control.invalid || !(control.touched || control.dirty)) return null;
    if (control.hasError('maxlength')) return 'El nombre admite hasta 200 caracteres.';
    return 'Escribí un nombre para la tarea.';
  }

  cerrarModal(): void {
    if (!this.guardando()) {
      this.modalAbierto.set(false);
      this.tareaEditando.set(null);
    }
  }

  guardarTarea(): void {
    if (this.form.invalid || this.guardando()) {
      this.form.markAllAsTouched();
      return;
    }

    const values = this.form.getRawValue();
    if (values.materiaId === null) return;

    const request: TareaRequest = {
      titulo: values.titulo.trim(),
      descripcion: values.descripcion.trim() || null,
      fechaLimite: values.fechaLimite || null,
    };

    this.guardando.set(true);
    this.accionError.set('');

    const editando = this.tareaEditando();
    if (editando) {
      this.tareaService.editarTarea(editando.id, request)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => this.guardando.set(false)),
        )
        .subscribe({
          next: (actualizada) => {
            this.guardando.set(false);
            this.tareas.update((current) =>
              current.map((item) => (item.id === editando.id ? { ...actualizada, materiaId: values.materiaId! } : item))
                .sort((a, b) => this.ordenarTareas(a, b)),
            );
            this.modalAbierto.set(false);
            this.tareaEditando.set(null);
          },
          error: () => this.accionError.set('No se pudo actualizar la tarea. Revisá los datos e intentá nuevamente.'),
        });
    } else {
      this.tareaService.crearTarea(values.materiaId, request)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => this.guardando.set(false)),
        )
        .subscribe({
          next: (tarea) => {
            this.guardando.set(false);
            this.tareas.update((current) => [...current, tarea].sort((a, b) => this.ordenarTareas(a, b)));
            this.modalAbierto.set(false);
            this.tareaEditando.set(null);
          },
          error: () => this.accionError.set('No se pudo guardar la tarea. Revisá los datos e intentá nuevamente.'),
        });
    }
  }

  private isDraggingMaterias = false;
  private dragStartX = 0;
  private dragScrollLeft = 0;
  private hasDraggedMaterias = false;

  iniciarArrastre(event: DragEvent, tarea: Tarea): void {
    if (this.estaEnProceso(tarea.id) || !event.dataTransfer) {
      event.preventDefault();
      return;
    }
    this.tareaArrastrada.set(tarea.id);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(tarea.id));
  }

  permitirDrop(event: DragEvent): void {
    const draggingId = this.tareaArrastrada();
    if (draggingId && this.estaEnProceso(draggingId)) {
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  soltarEnZona(event: DragEvent, zona: 'pendientes' | 'completadas'): void {
    event.preventDefault();
    const id = Number(event.dataTransfer?.getData('text/plain')) || this.tareaArrastrada();
    this.tareaArrastrada.set(null);
    if (!id || this.estaEnProceso(id)) return;
    const tarea = this.tareas().find((item) => item.id === id);
    if (!tarea || this.estaEnProceso(tarea.id)) return;

    const destinoCompletado = zona === 'completadas';
    if (tarea.completado !== destinoCompletado) {
      this.actualizarEstado(tarea, destinoCompletado);
    }
  }

  iniciarArrastreMaterias(event: MouseEvent, container: HTMLElement): void {
    if (event.button !== 0) return;
    this.isDraggingMaterias = true;
    this.hasDraggedMaterias = false;
    this.dragStartX = event.pageX - container.offsetLeft;
    this.dragScrollLeft = container.scrollLeft;
  }

  moverArrastreMaterias(event: MouseEvent, container: HTMLElement): void {
    if (!this.isDraggingMaterias) return;
    const x = event.pageX - container.offsetLeft;
    const walk = (x - this.dragStartX) * 1.3;
    if (Math.abs(x - this.dragStartX) > 4) {
      this.hasDraggedMaterias = true;
      event.preventDefault();
    }
    container.scrollLeft = this.dragScrollLeft - walk;
  }

  detenerArrastreMaterias(): void {
    this.isDraggingMaterias = false;
    setTimeout(() => {
      this.hasDraggedMaterias = false;
    }, 50);
  }

  seleccionarMateria(id: number): void {
    if (this.hasDraggedMaterias) return;
    this.toggleMateria(id);
  }

  cambiarEstado(tarea: Tarea): void {
    if (this.estaEnProceso(tarea.id)) return;
    this.actualizarEstado(tarea, !tarea.completado);
  }

  toggleMateria(id: number): void {
    this.materiasExcluidas.update((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  materiaActiva(id: number): boolean {
    return !this.materiasExcluidas().has(id);
  }

  limpiarFiltros(): void {
    this.materiasExcluidas.set(new Set());
  }

  eliminar(tarea: Tarea, event?: MouseEvent): void {
    event?.stopPropagation();
    if (this.estaEnProceso(tarea.id)) return;
    this.errorEliminar.set('');
    this.tareaAEliminar.set(tarea);
  }

  cerrarConfirmacionEliminar(): void {
    const tarea = this.tareaAEliminar();
    if (tarea && this.estaEnProceso(tarea.id)) return;
    this.tareaAEliminar.set(null);
    this.errorEliminar.set('');
  }

  confirmarEliminacion(): void {
    const tarea = this.tareaAEliminar();
    if (!tarea || this.estaEnProceso(tarea.id)) return;

    this.marcarEnProceso(tarea.id, true);
    this.errorEliminar.set('');
    this.tareaService.eliminarTarea(tarea.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.marcarEnProceso(tarea.id, false)),
      )
      .subscribe({
        next: () => {
          this.tareas.update((current) => current.filter((item) => item.id !== tarea.id));
          this.tareaAEliminar.set(null);
        },
        error: () => this.errorEliminar.set('No se pudo eliminar la tarea. Intentá nuevamente.'),
      });
  }

  nombreMateria(id: number): string {
    return this.materias().find((materia) => materia.id === id)?.nombre ?? 'Materia';
  }

  fechaTexto(fecha: string | null): string {
    if (!fecha) return '';
    const [year, month, day] = fecha.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(date);
  }

  fechaVencida(fecha: string | null): boolean {
    if (!fecha) return false;
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const val = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '00';
    const hoy = `${val('year')}-${val('month')}-${val('day')}`;
    return fecha < hoy;
  }

  estaEnProceso(id: number): boolean {
    return this.tareasEnProceso().has(id);
  }

  private actualizarEstado(tarea: Tarea, completada: boolean): void {
    if (this.estaEnProceso(tarea.id)) return;
    this.accionError.set('');

    const estadoAnterior = tarea.completado;
    this.tareas.update((current) =>
      current.map((item) => (item.id === tarea.id ? { ...item, completado: completada } : item)),
    );

    this.marcarEnProceso(tarea.id, true);
    this.tareaService.cambiarCompletado(tarea.id, completada)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.marcarEnProceso(tarea.id, false)),
      )
      .subscribe({
        next: (actualizada) => {
          this.tareas.update((current) =>
            current.map((item) =>
              item.id === actualizada.id ? { ...actualizada, materiaId: tarea.materiaId } : item,
            ),
          );
        },
        error: () => {
          this.tareas.update((current) =>
            current.map((item) => (item.id === tarea.id ? { ...item, completado: estadoAnterior } : item)),
          );
          this.accionError.set('No se pudo actualizar la tarea. Revisá tu conexión e intentá nuevamente.');
        },
      });
  }

  private ordenarTareas(a: Tarea, b: Tarea): number {
    if (a.fechaLimite === null && b.fechaLimite !== null) return 1;
    if (a.fechaLimite !== null && b.fechaLimite === null) return -1;
    if (a.fechaLimite !== null && b.fechaLimite !== null && a.fechaLimite !== b.fechaLimite) {
      return a.fechaLimite.localeCompare(b.fechaLimite);
    }
    return a.titulo.localeCompare(b.titulo);
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
