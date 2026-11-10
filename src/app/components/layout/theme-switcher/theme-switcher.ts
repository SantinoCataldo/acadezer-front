import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { gsap } from 'gsap';
import {
  ColorMode,
  ThemePreferenceService,
} from '@core/services/theme-preference.service';

interface SeedOption {
  label: string;
  color: string;
  swatch: string;
}

const paletteColors = [
  { label: 'Rojo', color: '#DB3443' },
  { label: 'Naranja', color: '#F97316' },
  { label: 'Verde', color: '#10E37B' },
  { label: 'Azul', color: '#1673EF' },
  { label: 'Violeta', color: '#7652E8' },
  { label: 'Magenta', color: '#CB13DC' },
  { label: 'Rosa', color: '#D980B8' },
];

@Component({
  selector: 'app-theme-switcher',
  templateUrl: './theme-switcher.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeSwitcher {
  readonly preferences = inject(ThemePreferenceService);
  private closing = false;
  readonly seeds: SeedOption[] = paletteColors.map(({ label, color }) => ({
    label,
    color,
    swatch: `radial-gradient(circle at 30% 24%, color-mix(in srgb, ${color} 46%, white) 0%, ${color} 54%, color-mix(in srgb, ${color} 78%, black) 100%)`,
  }));
  readonly modes: { id: ColorMode; label: string }[] = [
    { id: 'light', label: 'Claro' },
    { id: 'dark', label: 'Oscuro' },
    { id: 'system', label: 'Sistema' },
  ];
  selectSeed(seed: SeedOption): void {
    this.preferences.setVariant('tonalSpot');
    this.preferences.setSeed(seed.color);
  }

  selectMonochrome(): void {
    this.preferences.setVariant('monochrome');
  }

  handleSummaryClick(event: MouseEvent, disclosure: HTMLDetailsElement): void {
    if (!disclosure.open) return;

    event.preventDefault();
    if (this.closing) return;

    const panel = disclosure.querySelector<HTMLElement>('.theme-panel');
    if (!panel) {
      disclosure.open = false;
      return;
    }

    this.closing = true;
    const openAnimation = panel.getAnimations().find((animation) => animation.playState === 'running');
    openAnimation?.cancel();
    panel.style.animation = 'none';

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    gsap.to(panel, {
      autoAlpha: 0,
      y: 8,
      scale: 0.96,
      filter: 'blur(6px)',
      duration: reducedMotion ? 0 : 0.2,
      ease: 'power2.in',
      onComplete: () => {
        disclosure.open = false;
        panel.style.removeProperty('animation');
        gsap.set(panel, { clearProps: 'opacity,visibility,transform,filter' });
        this.closing = false;
      },
    });
  }
}
