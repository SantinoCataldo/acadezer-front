import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth-guard';

/** Rutas de detalle de materias. El listado vive dentro de Mi espacio (`/estudio`). */
export const subjectRoutes: Routes = [
  {
    path: 'estudio/materias/:id',
    loadComponent: () => import('./pages/subject-detail/subject-detail').then((m) => m.SubjectDetail),
    canActivate: [authGuard],
    data: { layout: 'bare' },
    title: 'Acadezer - Materia',
  },
];
