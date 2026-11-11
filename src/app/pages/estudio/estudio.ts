import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { NavigationStylePickerComponent, type NavigationStyle } from './navigation-style-picker.component';

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
  imports: [RouterLink, RouterLinkActive, RouterOutlet, NavigationStylePickerComponent],
  templateUrl: './estudio.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudySpaceComponent {
  private readonly auth = inject(AuthService);
  readonly currentUser = this.auth.currentUser;
  readonly navigationStyle = signal<NavigationStyle>(initialNavigationStyle());
  readonly navigationSettingsOpen = signal(false);

  toggleNavigationSettings(): void {
    this.navigationSettingsOpen.update((open) => !open);
  }

  setNavigationStyle(style: NavigationStyle): void {
    this.navigationStyle.set(style);
    try {
      localStorage.setItem('acadezer-study-navigation', style);
    } catch {
      this.navigationStyle.set(style);
    }
    this.navigationSettingsOpen.set(false);
  }

  logout(): void {
    this.auth.logout();
  }
}
