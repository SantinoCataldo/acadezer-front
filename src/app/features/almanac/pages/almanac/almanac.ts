import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { DiaSemana, SubjectResponse } from '../../../subjects/models';

interface ScheduleEntry {
  scheduleId: number;
  subjectId: number;
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
  readonly subjects = input.required<readonly SubjectResponse[]>();
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
              subjectId: subject.id,
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
    this.weeklyColumns().filter((day) => {
      const weekend = day.id === 'SABADO' || day.id === 'DOMINGO';
      return !weekend || this.showWeekends() || day.entries.length > 0;
    }),
  );

  readonly hasSchedule = computed(() => this.weeklyColumns().some((day) => day.entries.length > 0));

  weeklyCardHeight(durationMinutes: number): number {
    return Math.min(200, Math.max(48, durationMinutes * (40 / 60)));
  }

  toggleWeekends(): void {
    this.showWeekends.update((visible) => !visible);
  }

}
