import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth-guard';

/**
 * Rutas del feature de materias.
 *
 * No se agregan directo en app.routes.ts: el router general es superficie
 * compartida con el equipo de navegación. Se exportan listas para integrar:
 *
 *   import { subjectRoutes } from '@features/subjects';
 *   export const routes: Routes = [...subjectRoutes];
 */
export const subjectRoutes: Routes = [
  {
    path: 'materias',
    loadComponent: () => import('./pages/subject-list/subject-list').then((m) => m.SubjectList),
    canActivate: [authGuard],
    title: 'Acadezer - Materias',
  },
  {
    path: 'materias/:id',
    loadComponent: () => import('./pages/subject-detail/subject-detail').then((m) => m.SubjectDetail),
    canActivate: [authGuard],
    title: 'Acadezer - Materia',
  },
];
