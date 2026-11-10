import { Routes } from '@angular/router';
import { guestGuard } from '@core/guards/guest-guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/home/home').then((m) => m.HomeComponent),
    title: 'Acadezer - Inicio',
  },
  {
    path: 'login',
    loadComponent: () => import('@features/auth/pages/login/login').then((m) => m.Login),
    canActivate: [guestGuard],
    data: { layout: 'auth' },
    title: 'Acadezer - Iniciar sesión',
  },
  {
    path: 'register',
    loadComponent: () => import('@features/auth/pages/register/register').then((m) => m.Register),
    canActivate: [guestGuard],
    data: { layout: 'auth' },
    title: 'Acadezer - Crear cuenta',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
