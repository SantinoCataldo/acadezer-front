import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import {
  Hct,
  SchemeMonochrome,
  SchemeTonalSpot,
  argbFromHex,
  hexFromArgb,
} from '@material/material-color-utilities';

export type ColorMode = 'light' | 'dark' | 'system';
export type ThemeVariant = 'tonalSpot' | 'monochrome';

interface ThemePreference {
  seed: string;
  mode: ColorMode;
  variant: ThemeVariant;
}

const storageKey = 'acadezer_theme';
const defaultPreference: ThemePreference = { seed: '#5967D8', mode: 'system', variant: 'tonalSpot' };

function isPreference(value: unknown): value is ThemePreference {
  if (typeof value !== 'object' || value === null) return false;
  const preference = value as Record<string, unknown>;
  return (
    typeof preference['seed'] === 'string' && /^#[\da-fA-F]{6}$/.test(preference['seed']) &&
    ['light', 'dark', 'system'].includes(String(preference['mode'])) &&
    ['tonalSpot', 'monochrome'].includes(String(preference['variant']))
  );
}

@Injectable({ providedIn: 'root' })
export class ThemePreferenceService {
  private readonly document = inject(DOCUMENT);
  private readonly preference = signal(this.readPreference());
  private readonly prefersDark = signal(false);
  readonly seed = computed(() => this.preference().seed);
  readonly mode = computed(() => this.preference().mode);
  readonly variant = computed(() => this.preference().variant);
  readonly isDark = computed(() =>
    this.mode() === 'system' ? this.prefersDark() : this.mode() === 'dark',
  );

  constructor() {
    const media = this.document.defaultView?.matchMedia('(prefers-color-scheme: dark)');
    if (media) {
      this.prefersDark.set(media.matches);
      media.addEventListener('change', (event) => this.prefersDark.set(event.matches));
    }
    effect(() => {
      const preference = this.preference();
      const root = this.document.documentElement;
      root.dataset['themeVariant'] = preference.variant;
      root.classList.toggle('dark', this.isDark());
      this.applyColorScheme(root, preference.seed, preference.variant, this.isDark());
      try {
        this.document.defaultView?.localStorage.setItem(storageKey, JSON.stringify(preference));
      } catch {
        // Preferences remain active for this page if storage is unavailable.
      }
    });
  }

  setSeed(seed: string): void {
    if (!/^#[\da-fA-F]{6}$/.test(seed)) return;
    this.preference.update((current) => ({ ...current, seed: seed.toUpperCase() }));
  }

  setMode(mode: ColorMode): void {
    this.preference.update((current) => ({ ...current, mode }));
  }

  setVariant(variant: ThemeVariant): void {
    this.preference.update((current) => ({ ...current, variant }));
  }

  private readPreference(): ThemePreference {
    try {
      const stored: unknown = JSON.parse(
        this.document.defaultView?.localStorage.getItem(storageKey) ?? 'null',
      );
      if (isPreference(stored)) return stored;
      if (typeof stored === 'object' && stored !== null) {
        const legacy = stored as Record<string, unknown>;
        const mode = ['light', 'dark', 'system'].includes(String(legacy['mode']))
          ? (legacy['mode'] as ColorMode)
          : defaultPreference.mode;
        const storedSeed = typeof legacy['seed'] === 'string' && /^#[\da-fA-F]{6}$/.test(legacy['seed'])
          ? legacy['seed'].toUpperCase()
          : undefined;
        if (storedSeed) return { ...defaultPreference, seed: storedSeed, mode };
        const seeds: Record<string, string> = {
          indigo: '#5967D8', emerald: '#16845B', rose: '#C24D68', graphite: '#55555E',
        };
        const seed = seeds[String(legacy['palette'])];
        if (seed) return { ...defaultPreference, seed, mode };
      }
      return defaultPreference;
    } catch {
      return defaultPreference;
    }
  }

  private applyColorScheme(
    root: HTMLElement,
    seed: string,
    variant: ThemeVariant,
    dark: boolean,
  ): void {
    const sourceColor = Hct.fromInt(argbFromHex(seed));
    for (const isDark of [false, true]) {
      const scheme = variant === 'monochrome'
        ? new SchemeMonochrome(sourceColor, isDark, 0, '2025')
        : new SchemeTonalSpot(sourceColor, isDark, 0, '2025');
      for (const color of scheme.colors.allColors) {
        const role = color.name.replaceAll('_', '-');
        const value = hexFromArgb(scheme.getArgb(color));
        root.style.setProperty(`--md-sys-color-${role}-${isDark ? 'dark' : 'light'}`, value);
        if (isDark === dark) root.style.setProperty(`--md-sys-color-${role}`, value);
      }
    }
  }
}
