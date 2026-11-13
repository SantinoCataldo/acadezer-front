import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { gsap } from 'gsap';
import { Select, type SelectOption } from '../../../../components/ui/select/select';
import type { SubjectResponse } from '../../../subjects/models';
import { SubjectsService } from '../../../subjects/services/subjects.service';
import { DeleteEvaluacionDialog } from '../../components/delete-evaluacion-dialog/delete-evaluacion-dialog';
import { EvaluacionFormDialog } from '../../components/evaluacion-form-dialog/evaluacion-form-dialog';
import { EvaluacionService } from '../../evaluacion.service';
import type { EvaluacionResponse } from '../../models';
import { calcularPromedio } from '../../promedio';
import { primaryButton, secondaryButton } from '../../../subjects/dialog-styles';

type ListState = 'loading' | 'error' | 'ready';
export type FiltroEstado = 'todas' | 'proximas' | 'rendidas' | 'aprobadas' | 'desaprobadas';

interface Grupo {
  clave: string;
  titulo: string;
  detalle: string;
  evaluaciones: EvaluacionResponse[];
}

function esFutura(evaluacion: EvaluacionResponse, hoy: string): boolean {
  return evaluacion.fecha >= hoy;
}

function fechaLarga(valor: string): string {
  const date = new Date(`${valor}T00:00:00`);
  return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long' }).format(date);
}

@Component({
  selector: 'app-evaluaciones',
  imports: [RouterLink, FormsModule, Select, EvaluacionFormDialog, DeleteEvaluacionDialog],
  host: { class: 'block' },
  templateUrl: './evaluaciones.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Evaluaciones implements AfterViewInit {
  private readonly evaluaciones = inject(EvaluacionService);
  private readonly subjectsService = inject(SubjectsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly subjects = signal<readonly SubjectResponse[]>([]);
  readonly todas = signal<readonly EvaluacionResponse[]>([]);
  readonly state = signal<ListState>('loading');

  readonly filtroEstado = signal<FiltroEstado>('todas');
  readonly filtroMateriaId = signal<number>(0);

  readonly showFormDialog = signal(false);
  readonly formMateria = signal<{ id: number; nombre: string } | null>(null);
  readonly editing = signal<EvaluacionResponse | null>(null);
  readonly deleting = signal<EvaluacionResponse | null>(null);

  readonly today = new Date().toISOString().slice(0, 10);

  readonly primaryButtonClass = primaryButton;
  readonly secondaryButtonClass = secondaryButton;

  readonly opcionesMaterias = computed<readonly SelectOption<number>[]>(() => {
    const list: SelectOption<number>[] = [
      { value: 0, label: 'Todas las materias' },
    ];
    for (const sub of this.subjects()) {
      list.push({ value: sub.id, label: sub.nombre });
    }
    return list;
  });

  readonly materiaSeleccionada = computed(() => {
    const id = this.filtroMateriaId();
    if (!id || id === 0) return null;
    return this.subjects().find((s) => s.id === id) ?? null;
  });

  readonly promedioMateriaSeleccionada = computed(() => {
    const mat = this.materiaSeleccionada();
    if (!mat) return null;
    const evals = this.todas().filter((e) => e.materiaId === mat.id);
    return calcularPromedio(evals);
  });

  readonly evaluacionesPorMateria = computed(() => {
    const matId = this.filtroMateriaId();
    if (!matId || matId === 0) return this.todas();
    return this.todas().filter((e) => e.materiaId === matId);
  });

  readonly conteoTodas = computed(() => this.evaluacionesPorMateria().length);
  readonly conteoProximas = computed(
    () => this.evaluacionesPorMateria().filter((e) => e.calificacion === null).length,
  );
  readonly conteoRendidas = computed(
    () => this.evaluacionesPorMateria().filter((e) => e.calificacion !== null).length,
  );
  readonly conteoAprobadas = computed(
    () => this.evaluacionesPorMateria().filter((e) => e.calificacion !== null && e.calificacion >= 6).length,
  );
  readonly conteoDesaprobadas = computed(
    () => this.evaluacionesPorMateria().filter((e) => e.calificacion !== null && e.calificacion < 6).length,
  );

  readonly evaluacionesFiltradas = computed<EvaluacionResponse[]>(() => {
    const base = this.evaluacionesPorMateria();
    const filtro = this.filtroEstado();
    switch (filtro) {
      case 'proximas':
        return base.filter((e) => e.calificacion === null);
      case 'rendidas':
        return base.filter((e) => e.calificacion !== null);
      case 'aprobadas':
        return base.filter((e) => e.calificacion !== null && e.calificacion >= 6);
      case 'desaprobadas':
        return base.filter((e) => e.calificacion !== null && e.calificacion < 6);
      case 'todas':
      default:
        return [...base];
    }
  });

  readonly grupos = computed<Grupo[]>(() => {
    const base = this.evaluacionesFiltradas();
    const hoy = this.today;
    const futuras = base.filter((evaluacion) => evaluacion.calificacion === null || esFutura(evaluacion, hoy));
    const pasadas = base.filter((evaluacion) => evaluacion.calificacion !== null && !esFutura(evaluacion, hoy));

    const ordenar = (a: EvaluacionResponse, b: EvaluacionResponse) =>
      a.fecha.localeCompare(b.fecha) || a.nombre.localeCompare(b.nombre);

    const lista: Grupo[] = [];
    if (futuras.length > 0) {
      lista.push({
        clave: 'proximas',
        titulo: 'Próximas',
        detalle: 'Lo que tenés que rendir',
        evaluaciones: futuras.sort(ordenar),
      });
    }
    if (pasadas.length > 0) {
      lista.push({
        clave: 'rendidas',
        titulo: 'Rendidas',
        detalle: 'Con calificación registrada',
        evaluaciones: pasadas.sort((a, b) => ordenar(b, a)),
      });
    }
    return lista;
  });

  readonly isEmpty = computed(() => this.state() === 'ready' && this.todas().length === 0);
  readonly isFilterEmpty = computed(
    () => this.state() === 'ready' && this.todas().length > 0 && this.evaluacionesFiltradas().length === 0,
  );

  nombreMateria(materiaId: number): string {
    return this.subjects().find((subject) => subject.id === materiaId)?.nombre ?? 'Materia';
  }

  constructor() {
    this.load();
  }

  ngAfterViewInit(): void {
    if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.fromTo(
      '[data-reveal]',
      { autoAlpha: 0, y: 12, filter: 'blur(6px)' },
      {
        autoAlpha: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: 0.35,
        stagger: 0.05,
        ease: 'power2.out',
        clearProps: 'filter,transform,willChange',
      },
    );
  }

  load(): void {
    this.state.set('loading');
    this.subjectsService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (subjects) => {
          this.subjects.set(subjects);
          let pendientes = subjects.length;
          const acumulado: EvaluacionResponse[] = [];
          if (pendientes === 0) {
            this.state.set('ready');
            return;
          }
          for (const subject of subjects) {
            this.evaluaciones
              .listByMateria(subject.id)
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({
                next: (lista) => {
                  acumulado.push(...lista);
                  if (--pendientes === 0) {
                    this.todas.set(acumulado);
                    this.state.set('ready');
                  }
                },
                error: () => {
                  if (--pendientes === 0) {
                    this.todas.set(acumulado);
                    this.state.set('ready');
                  }
                },
              });
          }
        },
        error: () => {
          this.subjects.set([]);
          this.todas.set([]);
          this.state.set('error');
        },
      });
  }

  openCreateDialog(materia?: SubjectResponse): void {
    if (materia) {
      this.formMateria.set({ id: materia.id, nombre: materia.nombre });
    } else if (this.filtroMateriaId() > 0) {
      const actual = this.materiaSeleccionada();
      this.formMateria.set(actual ? { id: actual.id, nombre: actual.nombre } : null);
    } else {
      const primera = this.subjects()[0];
      this.formMateria.set(primera ? { id: primera.id, nombre: primera.nombre } : null);
    }
    this.editing.set(null);
    this.showFormDialog.set(true);
  }

  onFiltroMateriaChange(id: unknown): void {
    this.filtroMateriaId.set(Number(id) || 0);
  }

  limpiarFiltros(): void {
    this.filtroEstado.set('todas');
    this.filtroMateriaId.set(0);
  }

  openEditDialog(evaluacion: EvaluacionResponse): void {
    this.formMateria.set({
      id: evaluacion.materiaId,
      nombre: this.nombreMateria(evaluacion.materiaId),
    });
    this.editing.set(evaluacion);
    this.showFormDialog.set(true);
  }

  openDeleteDialog(evaluacion: EvaluacionResponse): void {
    this.deleting.set(evaluacion);
  }

  onSaved(saved: EvaluacionResponse): void {
    this.showFormDialog.set(false);
    this.formMateria.set(null);
    this.editing.set(null);
    this.todas.update((lista) => {
      const index = lista.findIndex((evaluacion) => evaluacion.id === saved.id);
      if (index === -1) return [...lista, saved];
      const next = [...lista];
      next[index] = saved;
      return next;
    });
  }

  onDeleted(deleted: EvaluacionResponse): void {
    this.deleting.set(null);
    this.todas.update((lista) => lista.filter((evaluacion) => evaluacion.id !== deleted.id));
  }

  onDialogCancelled(): void {
    this.showFormDialog.set(false);
    this.formMateria.set(null);
    this.editing.set(null);
    this.deleting.set(null);
  }

  fechaCorta(valor: string | undefined | null): string {
    if (!valor) return '';
    return fechaLarga(valor);
  }
}
