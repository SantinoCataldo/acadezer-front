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
    ],
  },
];
