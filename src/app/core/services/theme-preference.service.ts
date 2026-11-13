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
const defaultPreference: ThemePreference = {
  seed: '#5967D8',
  mode: 'system',
  variant: 'tonalSpot',
};
const seedMigrations: Readonly<Record<string, string>> = {
  '#F08A90': '#DB3443',
  '#E8434C': '#DB3443',
  '#FF8A1D': '#F97316',
  '#8317EB': '#7652E8',
};

function normalizeSeed(seed: string): string {
  const normalized = seed.toUpperCase();
  return seedMigrations[normalized] ?? normalized;
}

function relativeLuminance(hex: string): number {
  const linearChannel = (start: number): number => {
    const channel = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linearChannel(1) + 0.7152 * linearChannel(3) + 0.0722 * linearChannel(5);
}

function readableOnAccent(hex: string): string {
  const luminance = relativeLuminance(hex);
  const darkContrast = (luminance + 0.05) / (relativeLuminance('#101012') + 0.05);
  const lightContrast = 1.05 / (luminance + 0.05);
  return darkContrast >= lightContrast ? '#101012' : '#FFFFFF';
}

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
    this.applyPreference(this.preference());
    effect(() => this.applyPreference(this.preference()));
  }

  setSeed(seed: string): void {
    if (!/^#[\da-fA-F]{6}$/.test(seed)) return;
    this.preference.update((current) => ({ ...current, seed: normalizeSeed(seed) }));
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
      if (isPreference(stored)) {
        return {
          seed: normalizeSeed(stored.seed),
          mode: stored.mode,
          variant: stored.variant,
        };
      }
      if (typeof stored === 'object' && stored !== null) {
        const legacy = stored as Record<string, unknown>;
        const mode = ['light', 'dark', 'system'].includes(String(legacy['mode']))
          ? (legacy['mode'] as ColorMode)
          : defaultPreference.mode;
        const storedSeed = typeof legacy['seed'] === 'string' && /^#[\da-fA-F]{6}$/.test(legacy['seed'])
          ? normalizeSeed(legacy['seed'])
          : undefined;
        const variant = ['tonalSpot', 'monochrome'].includes(String(legacy['variant']))
          ? (legacy['variant'] as ThemeVariant)
          : defaultPreference.variant;
        if (storedSeed) return { seed: storedSeed, mode, variant };
        const seeds: Record<string, string> = {
          indigo: '#5967D8', emerald: '#16845B', rose: '#C24D68', graphite: '#55555E',
        };
        const seed = seeds[String(legacy['palette'])];
        if (seed) return { ...defaultPreference, seed, mode, variant };
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
    let tonalAccent = seed;
    for (const isDark of [false, true]) {
      const scheme = variant === 'monochrome'
        ? new SchemeMonochrome(sourceColor, isDark, 0, '2025')
        : new SchemeTonalSpot(sourceColor, isDark, 0, '2025');
      for (const color of scheme.colors.allColors) {
        const role = color.name.replaceAll('_', '-');
        const value = hexFromArgb(scheme.getArgb(color));
        root.style.setProperty(`--md-sys-color-${role}-${isDark ? 'dark' : 'light'}`, value);
        if (isDark === dark) {
          root.style.setProperty(`--md-sys-color-${role}`, value);
          if (color.name === 'primary') tonalAccent = value;
        }
      }
    }

    if (variant === 'monochrome') {
      root.style.removeProperty('--theme-accent');
      root.style.removeProperty('--theme-on-accent');
      this.updateFavicon(dark ? '#F5F3F6' : '#141316');
      return;
    }

    root.style.setProperty('--theme-accent', tonalAccent);
    root.style.setProperty('--theme-on-accent', readableOnAccent(tonalAccent));
    this.updateFavicon(tonalAccent);
  }

  private updateFavicon(accent: string): void {
    const icon = this.document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!icon) return;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
      <rect width="32" height="32" rx="8" fill="${accent}"/>
      <path d="M16 10.5C13.4 8.9 10.3 8.4 6 9.5v14c4.3-1.1 7.4-.6 10 1 2.6-1.6 5.7-2.1 10-1v-14c-4.3-1.1-7.4-.6-10 1Zm0 0v14" fill="none" stroke="${readableOnAccent(accent)}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
    icon.type = 'image/svg+xml';
    icon.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }

  private applyPreference(preference: ThemePreference): void {
    const root = this.document.documentElement;
    const dark = preference.mode === 'system' ? this.prefersDark() : preference.mode === 'dark';
    root.dataset['themeVariant'] = preference.variant;
    root.classList.toggle('dark', dark);
    this.applyColorScheme(root, preference.seed, preference.variant, dark);
    try {
      this.document.defaultView?.localStorage.setItem(storageKey, JSON.stringify(preference));
    } catch {
      return;
    }
  }
}
