import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, ChangeDetectorRef, inject, input, output, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { gsap } from 'gsap';
import { AuthService } from '@core/services/auth.service';
import { ThemeSwitcher } from '../../components/layout/theme-switcher/theme-switcher';
import { Modal } from '../../features/subjects/components/modal/modal';
import { NavigationStylePickerComponent, type NavigationStyle } from './navigation-style-picker.component';

type OptionsSection = 'account' | 'appearance' | 'navigation';

@Component({
  selector: 'app-study-options-dialog',
  imports: [Modal, ThemeSwitcher, NavigationStylePickerComponent, RouterLink],
  templateUrl: './study-options-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudyOptionsDialog {
  private readonly auth = inject(AuthService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sectionContent = viewChild<ElementRef<HTMLElement>>('sectionContent');
  readonly closed = output<void>();
  readonly currentUser = this.auth.currentUser;
  
  esAdmin = this.auth.isAdmin;
  readonly section = signal<OptionsSection>('account');
  readonly navigationStyle = input.required<NavigationStyle>();
  readonly styleSelected = output<NavigationStyle>();

  constructor() {
    if (typeof window !== 'undefined') {
      const onResize = () => {
        if (window.innerWidth < 640 && this.section() === 'navigation') {
          this.section.set('account');
        }
      };
      window.addEventListener('resize', onResize);
      this.destroyRef.onDestroy(() => window.removeEventListener('resize', onResize));
    }

    this.destroyRef.onDestroy(() => {
      const content = this.sectionContent()?.nativeElement;
      if (content) gsap.killTweensOf(content);
    });
  }

  selectSection(section: OptionsSection): void {
    if (section === this.section()) return;
    if (section === 'navigation' && typeof window !== 'undefined' && window.innerWidth < 640) return;

    const content = this.sectionContent()?.nativeElement;
    if (content) {
      gsap.killTweensOf(content);
      gsap.set(content, { clearProps: 'height,overflow,opacity,filter' });
    }
    const initialHeight = content?.getBoundingClientRect().height ?? 0;
    this.section.set(section);
    this.changeDetector.detectChanges();

    if (!content || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.fromTo(
      content,
      { height: initialHeight, overflow: 'hidden', opacity: 0.78, filter: 'blur(3px)' },
      {
        height: 'auto',
        opacity: 1,
        filter: 'blur(0px)',
        duration: 0.28,
        ease: 'power2.out',
        onComplete: () => gsap.set(content, { clearProps: 'height,overflow,opacity,filter' }),
      },
    );
  }

  userInitial(): string {
    return Array.from(this.currentUser()?.nombre.trim() ?? '')[0]?.toLocaleUpperCase('es-AR') ?? 'E';
  }

  logout(): void {
    this.auth.logout();
  }
}
