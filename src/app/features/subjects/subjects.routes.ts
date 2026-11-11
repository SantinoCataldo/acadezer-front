import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth-guard';

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
        loadComponent: () => import('./pages/subject-list/subject-list').then((m) => m.SubjectList),
        title: 'Acadezer - Mi espacio',
      },
      {
        path: 'materias/:id',
        loadComponent: () => import('./pages/subject-detail/subject-detail').then((m) => m.SubjectDetail),
        title: 'Acadezer - Materia',
      },
      {
        path: 'horario',
        loadComponent: () => import('../almanac/pages/almanac/almanac').then((m) => m.Almanac),
        title: 'Acadezer - Horario',
      },
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
