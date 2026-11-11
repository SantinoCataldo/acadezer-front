import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth-guard';
import { guestGuard } from '@core/guards/guest-guard';
import { subjectRoutes } from '@features/subjects/subjects.routes';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/home/home').then((m) => m.HomeComponent),
    data: { layout: 'bare' },
    title: 'Acadezer - Inicio',
  },
  {
    path: 'onboarding',
    loadComponent: () => import('./pages/onboarding/onboarding').then((m) => m.Onboarding),
    canActivate: [authGuard],
    data: { layout: 'auth' },
    title: 'Acadezer - Primeros pasos',
  },
  {
    path: 'home',
    pathMatch: 'full',
    redirectTo: '',
  },
  {
    path: '',
    loadComponent: () => import('@features/auth/components/auth-layout/auth-layout').then((m) => m.AuthLayout),
    data: { layout: 'auth' },
    children: [
      {
        path: 'login',
        loadComponent: () => import('@features/auth/pages/login/login').then((m) => m.Login),
        canActivate: [guestGuard],
        title: 'Acadezer - Iniciar sesión',
      },
      {
        path: 'register',
        loadComponent: () => import('@features/auth/pages/register/register').then((m) => m.Register),
        canActivate: [guestGuard],
        title: 'Acadezer - Crear cuenta',
      },
    ],
  },
  ...subjectRoutes,
  {
    path: '**',
    redirectTo: '',
  },
];
