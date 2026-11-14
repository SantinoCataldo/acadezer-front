import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type NavigationStyle = 'bonita' | 'dock' | 'guapa' | 'tasks' | 'melon';

export interface NavigationStyleOption {
  id: NavigationStyle;
  label: string;
}

const NAVIGATION_STYLES: readonly NavigationStyleOption[] = [
  { id: 'bonita', label: 'Clásica' },
  { id: 'dock', label: 'Dock' },
  { id: 'guapa', label: 'Bonita' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'melon', label: 'Panel' },
];

@Component({
  selector: 'app-navigation-style-picker',
  templateUrl: './navigation-style-picker.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavigationStylePickerComponent {
  readonly styles = NAVIGATION_STYLES;
  readonly embedded = input(false);
  readonly selected = input.required<NavigationStyle>();
  readonly styleSelected = output<NavigationStyle>();
  readonly closeRequested = output<void>();
}
