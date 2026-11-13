import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth-guard';
import { canDeactivateUnsavedChangesGuard } from '../../core/guards/unsaved-changes.guard';

/** Rutas privadas del espacio de estudio y sus materias. */
export const subjectRoutes: Routes = [
  {
    path: 'estudio',
    loadComponent: () => import('../../pages/estudio/estudio').then((m) => m.StudySpaceComponent),
    canActivate: [authGuard],
    data: { layout: 'bare' },
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./pages/study-home/study-home').then((m) => m.StudyHome),
        title: 'Acadezer - Inicio',
      },
      {
        path: 'materias',
        loadComponent: () => import('./pages/subject-list/subject-list').then((m) => m.SubjectList),
        title: 'Acadezer - Materias',
      },
      {
        path: 'calendario',
        loadComponent: () => import('./pages/study-calendar/study-calendar').then((m) => m.StudyCalendar),
        title: 'Acadezer - Calendario',
      },
      {
        path: 'apuntes',
        loadComponent: () => import('./pages/notes-page/notes-page').then((m) => m.NotesPage),
        canDeactivate: [canDeactivateUnsavedChangesGuard],
        title: 'Acadezer - Apuntes',
      },
      {
        path: 'evaluaciones',
        loadComponent: () =>
          import('../evaluaciones/pages/evaluaciones/evaluaciones').then((m) => m.Evaluaciones),
        title: 'Acadezer - Evaluaciones',
      },
      {
        path: 'materias/:id',
        loadComponent: () => import('./pages/subject-detail/subject-detail').then((m) => m.SubjectDetail),
        canDeactivate: [canDeactivateUnsavedChangesGuard],
        title: 'Acadezer - Materia',
      },
      { path: 'horario', pathMatch: 'full', redirectTo: 'materias' },
      {
        path: 'tareas',
        loadComponent: () => import('../tareas/pages/tareas-list/tareas-list').then((m) => m.TareasList),
        title: 'Acadezer - Tareas',
      },
      {
        path: 'tareas/nueva/:materiaId',
        loadComponent: () => import('../tareas/pages/tarea-form/tarea-form').then((m) => m.TareaForm),
        title: 'Acadezer - Nueva tarea',
      },
      {
        path: 'tareas/editar/:id',
        loadComponent: () => import('../tareas/pages/tarea-form/tarea-form').then((m) => m.TareaForm),
        title: 'Acadezer - Editar tarea',
      },
    ],
  },
];
