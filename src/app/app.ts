import { Component, inject } from '@angular/core';
import { Location } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { Footer, Navbar } from './components/layout';
import { ThemeSwitcher } from './components/layout/theme-switcher/theme-switcher';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, Footer, ThemeSwitcher],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  readonly showLayout = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => {
        const layout = this.router.routerState.snapshot.root.firstChild?.data['layout'];
        return layout !== 'auth' && layout !== 'bare';
      }),
    ),
    { initialValue: this.shouldShowLayout(this.location.path()) },
  );
  readonly showThemeSwitcher = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => this.shouldShowThemeSwitcher(event.urlAfterRedirects)),
    ),
    { initialValue: this.shouldShowThemeSwitcher(this.location.path()) },
  );

  private shouldShowLayout(url: string): boolean {
    const path = url.split(/[?#]/, 1)[0]?.replace(/\/+$/, '') || '/';
    const isStudySpace = path === '/estudio' || path.startsWith('/estudio/');
    const isAdmin = path === '/admin' || path.startsWith('/admin/');
    return (
      !isStudySpace &&
      !isAdmin &&
      path !== '/' &&
      path !== '/home' &&
      path !== '/login' &&
      path !== '/register' &&
      path !== '/onboarding'
    );
  }

  private shouldShowThemeSwitcher(url: string): boolean {
    const path = url.split(/[?#]/, 1)[0]?.replace(/\/+$/, '') || '/';
    return path !== '/onboarding' && path !== '/estudio' && !path.startsWith('/estudio/');
  }
}
