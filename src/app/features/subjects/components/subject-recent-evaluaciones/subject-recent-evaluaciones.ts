import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { EvaluacionService } from '../../../evaluaciones/evaluacion.service';
import type { EvaluacionResponse } from '../../../evaluaciones/models';

type RecentEvaluacionesState = 'loading' | 'error' | 'ready';

function fechaCorta(valor: string): string {
  const date = new Date(`${valor}T00:00:00`);
  return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' }).format(date);
}

@Component({
  selector: 'app-subject-recent-evaluaciones',
  imports: [RouterLink],
  templateUrl: './subject-recent-evaluaciones.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubjectRecentEvaluaciones {
  readonly materiaId = input.required<number>();

  private readonly evaluacionService = inject(EvaluacionService);
  private readonly destroyRef = inject(DestroyRef);
  private requestVersion = 0;

  readonly state = signal<RecentEvaluacionesState>('loading');
  readonly evaluaciones = signal<readonly EvaluacionResponse[]>([]);

  constructor() {
    effect(() => this.load(this.materiaId()));
  }

  load(materiaId = this.materiaId()): void {
    const requestVersion = ++this.requestVersion;
    this.state.set('loading');
    this.evaluaciones.set([]);

    this.evaluacionService
      .listByMateria(materiaId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (all) => {
          if (requestVersion !== this.requestVersion) return;

          // Ordenar por fecha (las más próximas o recientes primero)
          const ordenadas = [...all].sort((a, b) => b.fecha.localeCompare(a.fecha));
          this.evaluaciones.set(ordenadas.slice(0, 3));
          this.state.set('ready');
        },
        error: () => {
          if (requestVersion === this.requestVersion) this.state.set('error');
        },
      });
  }

  formatFecha(fecha: string): string {
    return fechaCorta(fecha);
  }
}
