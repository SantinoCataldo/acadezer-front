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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { gsap } from 'gsap';
import type { SubjectResponse } from '../../../subjects/models';
import { SubjectsService } from '../../../subjects/services/subjects.service';
import { DeleteEvaluacionDialog } from '../../components/delete-evaluacion-dialog/delete-evaluacion-dialog';
import { EvaluacionFormDialog } from '../../components/evaluacion-form-dialog/evaluacion-form-dialog';
import { EvaluacionService } from '../../evaluacion.service';
import type { EvaluacionResponse } from '../../models';
import {
  ESTADOS_EVALUACION,
  TIPOS_EVALUACION,
  type EstadoEvaluacion,
  type TipoEvaluacion,
} from '../../models';
import { ETIQUETA_ESTADO_CURSADA, calcularPromedio, type EstadoCursada } from '../../promedio';
import { primaryButton, secondaryButton } from '../../../subjects/dialog-styles';

type ListState = 'loading' | 'error' | 'ready';

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
  imports: [RouterLink, EvaluacionFormDialog, DeleteEvaluacionDialog],
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

  readonly formMateria = signal<{ id: number; nombre: string } | null>(null);
  readonly editing = signal<EvaluacionResponse | null>(null);
  readonly deleting = signal<EvaluacionResponse | null>(null);

  readonly today = new Date().toISOString().slice(0, 10);

  readonly primaryButtonClass = primaryButton;
  readonly secondaryButtonClass = secondaryButton;

  readonly grupos = computed<Grupo[]>(() => {
    const hoy = this.today;
    const futuras = this.todas().filter((evaluacion) => esFutura(evaluacion, hoy));
    const pasadas = this.todas().filter((evaluacion) => !esFutura(evaluacion, hoy));

    const ordenar = (a: EvaluacionResponse, b: EvaluacionResponse) =>
      a.fecha.localeCompare(b.fecha) || a.nombre.localeCompare(b.nombre);

    const lista: Grupo[] = [
      {
        clave: 'proximas',
        titulo: 'Próximas',
        detalle: 'Lo que tenés que rendir',
        evaluaciones: futuras.sort(ordenar),
      },
      {
        clave: 'rendidas',
        titulo: 'Rendidas',
        detalle: 'Con su nota y resultado',
        evaluaciones: pasadas.sort((a, b) => ordenar(b, a)),
      },
    ];
    return lista.filter((grupo) => grupo.evaluaciones.length > 0);
  });

  readonly resumen = computed(() => {
    const porMateria = new Map<number, EvaluacionResponse[]>();
    for (const evaluacion of this.todas()) {
      const lista = porMateria.get(evaluacion.materiaId) ?? [];
      lista.push(evaluacion);
      porMateria.set(evaluacion.materiaId, lista);
    }
    return this.subjects().map((subject) => ({
      subject,
      resumen: calcularPromedio(porMateria.get(subject.id) ?? []),
    }));
  });

  readonly isEmpty = computed(() => this.state() === 'ready' && this.todas().length === 0);

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

  openCreateDialog(): void {
    const primera = this.subjects()[0];
    if (!primera) return;
    this.formMateria.set({ id: primera.id, nombre: primera.nombre });
  }

  openEditDialog(evaluacion: EvaluacionResponse): void {
    this.formMateria.set({
      id: evaluacion.materiaId,
      nombre: this.nombreMateria(evaluacion.materiaId),
    });
    this.editing.set(evaluacion);
  }

  openDeleteDialog(evaluacion: EvaluacionResponse): void {
    this.deleting.set(evaluacion);
  }

  onSaved(saved: EvaluacionResponse): void {
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
    this.formMateria.set(null);
    this.editing.set(null);
    this.deleting.set(null);
  }

  fechaCorta(valor: string | undefined | null): string {
    if (!valor) return '';
    return fechaLarga(valor);
  }

  etiquetaTipo(tipo: TipoEvaluacion | string | undefined | null): string {
    if (!tipo) return '';
    return TIPOS_EVALUACION.find((item) => item.valor === tipo)?.etiqueta ?? String(tipo);
  }

  etiquetaEstadoEvaluacion(estado: EstadoEvaluacion | string | undefined | null): string {
    if (!estado) return '';
    return ESTADOS_EVALUACION.find((item) => item.valor === estado)?.etiqueta ?? String(estado);
  }

  etiquetaEstado(estado: EstadoCursada | string | undefined | null): string {
    if (!estado) return '';
    return ETIQUETA_ESTADO_CURSADA[estado as EstadoCursada] ?? String(estado);
  }
}
