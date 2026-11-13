import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { EvaluacionResponse } from '../../models';
import { EvaluacionService } from '../../evaluacion.service';
import { calcularPromedio, detalleEstadoCursada } from '../../promedio';
import { ETIQUETA_ESTADO_CURSADA } from '../../promedio';

type SummaryState = 'loading' | 'error' | 'ready';

const ESTADO_CLASES: Record<string, string> = {
  PROMOCIONADO: 'bg-[var(--theme-accent-soft)] text-[var(--theme-accent-content)]',
  REGULAR: 'bg-[var(--theme-surface-high)] text-[var(--theme-foreground)]',
  DESAPROBADO:
    'bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)]',
  PENDIENTE: 'bg-[var(--theme-surface-high)] text-[var(--theme-muted)]',
};

@Component({
  selector: 'app-evaluaciones-summary',
  imports: [RouterLink],
  templateUrl: './evaluaciones-summary.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvaluacionesSummary {
  readonly materiaId = input.required<number>();

  private readonly evaluaciones = inject(EvaluacionService);
  private readonly destroyRef = inject(DestroyRef);

  private loadedMateriaId: number | null = null;

  readonly state = signal<SummaryState>('loading');
  readonly evaluacionesLista = signal<readonly EvaluacionResponse[]>([]);

  readonly resumen = computed(() => calcularPromedio(this.evaluacionesLista()));
  readonly etiqueta = computed(() => ETIQUETA_ESTADO_CURSADA[this.resumen().estado]);
  readonly detalle = computed(() => detalleEstadoCursada(this.resumen()));
  readonly sinNota = computed(() => {
    const pendientes = this.evaluacionesLista().filter(
      (evaluacion) => evaluacion.calificacion === null,
    ).length;
    if (pendientes === 0) return null;
    return `${pendientes === 1 ? 'Queda 1 evaluación' : `Quedan ${pendientes} evaluaciones`} sin nota.`;
  });

  constructor() {
    effect(() => {
      const materiaId = this.materiaId();
      if (this.loadedMateriaId === materiaId) return;
      this.loadedMateriaId = materiaId;
      this.load(materiaId);
    });
  }

  load(materiaId = this.materiaId()): void {
    this.state.set('loading');
    this.evaluaciones
      .listByMateria(materiaId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (evaluaciones) => {
          this.evaluacionesLista.set(evaluaciones);
          this.state.set('ready');
        },
        error: () => {
          this.evaluacionesLista.set([]);
          this.state.set('error');
        },
      });
  }

  estadoClases(): string {
    return ESTADO_CLASES[this.resumen().estado] ?? ESTADO_CLASES['PENDIENTE'];
  }
}
