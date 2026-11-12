import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, inject, Injector, signal, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { gsap } from 'gsap';
import type { DiaSemana, SubjectResponse } from '../../models';
import { SubjectsService } from '../../services/subjects.service';
import { DeleteSubjectDialog } from '../../components/delete-subject-dialog/delete-subject-dialog';
import { SubjectFormDialog } from '../../components/subject-form-dialog/subject-form-dialog';
import { Almanac } from '../../../almanac/pages/almanac/almanac';
import { iconButton, primaryButton } from '../../dialog-styles';

type ListState = 'loading' | 'error' | 'ready';

const shortDayLabels: Record<DiaSemana, string> = {
  LUNES: 'lun',
  MARTES: 'mar',
  MIERCOLES: 'mié',
  JUEVES: 'jue',
  VIERNES: 'vie',
  SABADO: 'sáb',
  DOMINGO: 'dom',
};

/**
 * Listado de materias del usuario autenticado.
 *
 * MAT-03: lista las materias propias, ofrece crear la primera cuando no hay
 * ninguna y usa los estados de carga y error con recuperación (RNF-04).
 * Los diálogos de crear/editar y eliminar se reutilizan desde el detalle.
 */
@Component({
  selector: 'app-subject-list',
  imports: [RouterLink, SubjectFormDialog, DeleteSubjectDialog, Almanac],
  host: { class: 'block' },
  templateUrl: './subject-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubjectList {
  private readonly subjectsService = inject(SubjectsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  @ViewChild('viewPanel') private viewPanel?: ElementRef<HTMLElement>;
  private viewTimeline: gsap.core.Timeline | null = null;

  readonly subjects = signal<readonly SubjectResponse[]>([]);
  readonly state = signal<ListState>('loading');
  readonly activeView = signal<'subjects' | 'grid' | 'week'>('subjects');

  /** null = cerrado; 'new' o una materia concreta = diálogo de formulario. */
  readonly formTarget = signal<SubjectResponse | 'new' | null>(null);
  readonly deleteTarget = signal<SubjectResponse | null>(null);

  readonly isEmpty = computed(() => this.state() === 'ready' && this.subjects().length === 0);

  // Referencias para la plantilla.
  readonly primaryButtonClass = primaryButton;
  readonly iconButtonClass = iconButton;

  dayLabel(day: DiaSemana): string {
    return shortDayLabels[day];
  }

  subjectInitial(name: string): string {
    return Array.from(name.trim())[0]?.toLocaleUpperCase('es-AR') ?? '?';
  }

  constructor() {
    this.destroyRef.onDestroy(() => this.viewTimeline?.kill());
    this.load();
  }

  load(): void {
    this.state.set('loading');
    this.subjectsService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.subjects.set(list);
          this.state.set('ready');
        },
        error: () => {
          this.subjects.set([]);
          this.state.set('error');
        },
      });
  }

  activeViewIndex(): number {
    return ['subjects', 'grid', 'week'].indexOf(this.activeView());
  }

  setActiveView(view: 'subjects' | 'grid' | 'week'): void {
    if (this.activeView() === view) return;
    const panel = this.viewPanel?.nativeElement;
    const startHeight = panel?.getBoundingClientRect().height ?? 0;
    this.viewTimeline?.kill();
    this.activeView.set(view);
    if (!panel) return;

    afterNextRender(() => this.animateView(panel, startHeight), { injector: this.injector });
  }

  private animateView(panel: HTMLElement, startHeight: number): void {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const entering = panel.querySelectorAll<HTMLElement>('[data-view-enter]');
    const targetHeight = panel.scrollHeight;
    if (reduceMotion) return;

    gsap.set(panel, { height: startHeight, overflow: 'hidden' });
    gsap.set(entering, { autoAlpha: 0, y: 8, filter: 'blur(7px)' });
    this.viewTimeline = gsap.timeline({
      onComplete: () => gsap.set(panel, { clearProps: 'height,overflow' }),
    });
    this.viewTimeline.to(panel, {
      height: targetHeight,
      duration: 0.36,
      ease: 'power3.out',
      clearProps: 'height,overflow',
    }, 0);
    this.viewTimeline.to(entering, {
      autoAlpha: 1,
      y: 0,
      filter: 'blur(0px)',
      duration: 0.32,
      stagger: 0.045,
      ease: 'power2.out',
      clearProps: 'opacity,visibility,transform,filter',
    }, 0.04);
  }

  openCreateDialog(): void {
    this.formTarget.set('new');
  }

  openEditDialog(subject: SubjectResponse): void {
    this.formTarget.set(subject);
  }

  openDeleteDialog(subject: SubjectResponse): void {
    this.deleteTarget.set(subject);
  }

  /** MAT-01: refleja los datos confirmados por la API, no los del formulario. */
  onSubjectSaved(saved: SubjectResponse): void {
    this.formTarget.set(null);
    this.subjects.update((list) => {
      const index = list.findIndex((subject) => subject.id === saved.id);
      if (index === -1) return [...list, saved];
      const next = [...list];
      next[index] = saved;
      return next;
    });
  }

  onSubjectDeleted(deleted: SubjectResponse): void {
    this.deleteTarget.set(null);
    this.subjects.update((list) => list.filter((subject) => subject.id !== deleted.id));
  }

  onDialogCancelled(): void {
    this.formTarget.set(null);
    this.deleteTarget.set(null);
  }
}
