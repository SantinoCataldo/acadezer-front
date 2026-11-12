import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import type { Tarea } from '../../../tareas/tarea';
import { TareaService } from '../../../tareas/tarea-service';

type RecentTasksState = 'loading' | 'error' | 'ready';

@Component({
  selector: 'app-subject-recent-tasks',
  imports: [RouterLink],
  templateUrl: './subject-recent-tasks.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubjectRecentTasks {
  readonly materiaId = input.required<number>();

  private readonly tareaService = inject(TareaService);
  private readonly destroyRef = inject(DestroyRef);
  private requestVersion = 0;

  readonly state = signal<RecentTasksState>('loading');
  readonly tasks = signal<readonly Tarea[]>([]);
  readonly totalPendientes = signal(0);

  constructor() {
    effect(() => this.load(this.materiaId()));
  }

  load(materiaId = this.materiaId()): void {
    const requestVersion = ++this.requestVersion;
    this.state.set('loading');
    this.tasks.set([]);
    this.totalPendientes.set(0);

    this.tareaService
      .getTareas(materiaId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (allTasks) => {
          if (requestVersion !== this.requestVersion) return;
          const pendientes = allTasks.filter((t) => !t.completado);
          this.totalPendientes.set(pendientes.length);

          const ordenadas = [...pendientes].sort((a, b) => {
            if (a.fechaLimite && b.fechaLimite) return a.fechaLimite.localeCompare(b.fechaLimite);
            if (a.fechaLimite) return -1;
            if (b.fechaLimite) return 1;
            return a.id - b.id;
          });

          this.tasks.set(ordenadas.slice(0, 3));
          this.state.set('ready');
        },
        error: () => {
          if (requestVersion === this.requestVersion) this.state.set('error');
        },
      });
  }

  formatearFecha(fecha: string | null | undefined): string {
    if (!fecha) return '';
    const [year, month, day] = fecha.split('-').map(Number);
    if (!year || !month || !day) return fecha;
    const date = new Date(Date.UTC(year, month - 1, day));
    return new Intl.DateTimeFormat('es-AR', {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    }).format(date);
  }

  fechaVencida(fecha: string | null | undefined): boolean {
    if (!fecha) return false;
    const [year, month, day] = fecha.split('-').map(Number);
    const limite = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));
    return limite.getTime() < Date.now();
  }
}
