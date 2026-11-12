import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
} from '@angular/core';
import { gsap } from 'gsap';
import { authAppearance } from '@features/auth/auth-theme';
import { Buho } from '../buho/buho';
import { BuhoStateService } from '../../services/buho-state.service';

@Component({
  selector: 'app-auth-hero',
  imports: [Buho],
  templateUrl: './auth-hero.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthHero implements AfterViewInit {
  private readonly element = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  readonly buhoState = inject(BuhoStateService);
  private introContext: gsap.Context | null = null;

  readonly appearance = authAppearance;

  readonly buhoMensaje = computed(() => {
    const estado = this.buhoState.estado();
    const espiando = this.buhoState.espiando();
    if (estado === 'feliz') return '¡Excelente! Ya entramos... 🎉';
    if (estado === 'error') return 'Mmm, revisá los datos ingresados 🤔';
    if (estado === 'tapado' && espiando) return '¡Epa! Te vi mirando la contraseña 👀';
    if (estado === 'tapado') return 'Tranqui, no miro tu contraseña 🙈';
    if (estado === 'escribiendo') return 'Te sigo mientras escribís... ✍️';
    return '¡Hola! Te acompaño en tu estudio 🦉';
  });

  ngAfterViewInit(): void {
    const host = this.element.nativeElement;
    this.destroyRef.onDestroy(() => {
      this.introContext?.revert();
    });

    if (
      typeof window === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    this.introContext = gsap.context(() => {
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .fromTo(
          '[data-hero-brand]',
          { autoAlpha: 0, y: -6 },
          { autoAlpha: 1, y: 0, duration: 0.35 },
        )
        .fromTo(
          '[data-hero-copy]',
          { autoAlpha: 0, y: 10 },
          { autoAlpha: 1, y: 0, duration: 0.45 },
          '-=0.12',
        )
        .fromTo(
          '[data-buho-card]',
          { autoAlpha: 0, y: 12, scale: 0.985 },
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.45 },
          '-=0.14',
        );
    }, host);
  }
}
