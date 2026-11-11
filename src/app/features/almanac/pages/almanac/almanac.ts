import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import type { DiaSemana, SubjectResponse } from '../../../subjects/models';
import { SubjectsService } from '../../../subjects/services/subjects.service';

type PageState = 'loading' | 'error' | 'ready';

interface ScheduleEntry {
  scheduleId: number;
  subjectName: string;
  start: string;
  end: string;
  durationMinutes: number;
}

interface DayColumn {
  id: DiaSemana;
  label: string;
  fullLabel: string;
}

interface WeeklyColumn extends DayColumn {
  entries: readonly ScheduleEntry[];
}

const DAYS: readonly DayColumn[] = [
  { id: 'LUNES', label: 'Lun', fullLabel: 'Lunes' },
  { id: 'MARTES', label: 'Mar', fullLabel: 'Martes' },
  { id: 'MIERCOLES', label: 'Mié', fullLabel: 'Miércoles' },
  { id: 'JUEVES', label: 'Jue', fullLabel: 'Jueves' },
  { id: 'VIERNES', label: 'Vie', fullLabel: 'Viernes' },
  { id: 'SABADO', label: 'Sáb', fullLabel: 'Sábado' },
  { id: 'DOMINGO', label: 'Dom', fullLabel: 'Domingo' },
];

function formatTime(value: string): string {
  const [hours = '00', minutes = '00'] = value.split(':');
  return `${hours}:${minutes}`;
}

function timeToMinutes(value: string): number {
  const [hours = '0', minutes = '0'] = value.split(':');
  return Number(hours) * 60 + Number(minutes);
}

@Component({
  selector: 'app-almanac',
  imports: [RouterLink],
  host: { class: 'block' },
  templateUrl: './almanac.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Almanac {
  private readonly subjectsService = inject(SubjectsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly subjects = signal<readonly SubjectResponse[]>([]);
  readonly state = signal<PageState>('loading');
  readonly showWeekends = signal(false);

  readonly weeklyColumns = computed<readonly WeeklyColumn[]>(() =>
    DAYS.map((day) => {
      const entries = this.subjects().flatMap((subject) =>
        subject.horarios
          .filter((schedule) => schedule.diaSemana === day.id)
          .map((schedule) => {
            const start = formatTime(schedule.horaInicio);
            const end = formatTime(schedule.horaFin);
            return {
              scheduleId: schedule.id,
              subjectName: subject.nombre,
              start,
              end,
              durationMinutes: timeToMinutes(end) - timeToMinutes(start),
            };
          }),
      );
      return {
        ...day,
        entries: entries.sort((first, second) =>
          timeToMinutes(first.start) - timeToMinutes(second.start)
          || first.subjectName.localeCompare(second.subjectName, 'es'),
        ),
      };
    }),
  );

  readonly visibleWeeklyColumns = computed(() =>
    this.weeklyColumns().filter((day) =>
      (day.id !== 'SABADO' && day.id !== 'DOMINGO') || this.showWeekends(),
    ),
  );

  readonly hasSchedule = computed(() => this.weeklyColumns().some((day) => day.entries.length > 0));

  weeklyCardHeight(durationMinutes: number): number {
    return Math.min(200, Math.max(48, durationMinutes * (40 / 60)));
  }

  toggleWeekends(): void {
    this.showWeekends.update((visible) => !visible);
  }

  constructor() {
    this.load();
  }

  load(): void {
    this.state.set('loading');
    this.subjectsService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (subjects) => {
          this.subjects.set(subjects);
          this.showWeekends.set(subjects.some((subject) =>
            subject.horarios.some((schedule) => schedule.diaSemana === 'SABADO' || schedule.diaSemana === 'DOMINGO'),
          ));
          this.state.set('ready');
        },
        error: () => {
          this.subjects.set([]);
          this.state.set('error');
        },
      });
  }
}
