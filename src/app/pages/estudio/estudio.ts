import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { ThemePreferenceService } from '@core/services/theme-preference.service';
import type { NavigationStyle } from './navigation-style-picker.component';
import { StudyOptionsDialog } from './study-options-dialog';

function isNavigationStyle(value: string | null): value is NavigationStyle {
  return value === 'bonita' || value === 'dock' || value === 'guapa'
    || value === 'tasks' || value === 'melon';
}

function initialNavigationStyle(): NavigationStyle {
  try {
    const saved = localStorage.getItem('acadezer-study-navigation');
    return isNavigationStyle(saved) ? saved : 'guapa';
  } catch {
    return 'guapa';
  }
}

@Component({
  selector: 'app-study-space',
  imports: [RouterLink, RouterOutlet, StudyOptionsDialog],
  templateUrl: './estudio.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudySpaceComponent {
  private readonly router = inject(Router);

  constructor() {
    inject(ThemePreferenceService);
  }

  readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  readonly homeActive = () => {
    const path = this.currentUrl().split(/[?#]/)[0] ?? '';
    return path === '/estudio';
  };
  readonly subjectsActive = () => {
    const path = this.currentUrl().split(/[?#]/)[0] ?? '';
    return path === '/estudio/materias' || path.startsWith('/estudio/materias/');
  };
  readonly calendarActive = () => {
    return (this.currentUrl().split(/[?#]/)[0] ?? '') === '/estudio/calendario';
  };
  readonly navigationStyle = signal<NavigationStyle>(initialNavigationStyle());
  readonly optionsOpen = signal(false);

  openOptions(): void {
    this.optionsOpen.set(true);
  }

  setNavigationStyle(style: NavigationStyle): void {
    this.navigationStyle.set(style);
    try {
      localStorage.setItem('acadezer-study-navigation', style);
    } catch {
      this.navigationStyle.set(style);
    }
  }

  navigationItemClass(active: boolean): string {
    const style = this.navigationStyle();
    const shape = style === 'guapa' ? 'rounded-full' : style === 'tasks'
      ? (active ? 'rounded-[13px]' : 'rounded-full')
      : style === 'melon' ? 'rounded-[13px]' : 'rounded-[14px]';
    const activeColor = active
      ? style === 'guapa' ? 'bg-[var(--theme-accent)] text-[var(--theme-on-accent)]'
        : style === 'bonita' ? 'bg-[var(--theme-surface)] text-[var(--theme-foreground)]'
          : 'bg-[var(--theme-accent-soft)] text-[var(--theme-accent-content)]'
      : 'text-[var(--theme-muted)] hover:bg-[var(--theme-surface)] hover:text-[var(--theme-foreground)]';
    return `flex items-center gap-3 px-3 text-sm font-medium transition-[background-color,color,transform,border-radius] duration-300 hover:scale-[0.99] active:scale-[1.01] motion-reduce:transition-none ${style === 'tasks' ? 'min-h-14 justify-center' : 'min-h-11'} ${shape} ${activeColor}`;
  }
}
