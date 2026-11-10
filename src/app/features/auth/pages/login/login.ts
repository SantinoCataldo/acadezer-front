import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { TextField } from '@components/ui/text-field/text-field';
import { AuthFormReveal } from '@features/auth/directives/auth-form-reveal.directive';
import { authAppearance } from '@features/auth/auth-theme';
import { gsap } from 'gsap';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, TextField, AuthFormReveal],
  host: { class: 'block w-full' },
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private isNavigating = false;
  readonly appearance = authAppearance;

  readonly action = this.auth.loginAction;

  readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    password: ['', [Validators.required, Validators.maxLength(72)]],
  });

  emailErrorMessage(): string | null {
    const control = this.form.controls.email;
    if (!control.touched || !control.invalid) return null;
    if (control.hasError('required')) return 'Ingresá tu correo electrónico.';
    if (control.hasError('maxlength')) return 'El correo supera el máximo permitido.';
    return 'Revisá el formato del correo electrónico.';
  }

  passwordErrorMessage(): string | null {
    const control = this.form.controls.password;
    if (!control.touched || !control.invalid) return null;
    if (control.hasError('required')) return 'Ingresá tu contraseña.';
    return 'La contraseña supera el máximo permitido.';
  }

  submit(): void {
    if (this.action.disabled()) return;

    this.form.markAllAsTouched();

    if (this.form.invalid) return;

    this.auth
      .login(this.form.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.form.controls.password.reset();
          void this.router.navigateByUrl('/estudio');
        },
        error: () => undefined,
      });
  }

  navigateToRegister(event: MouseEvent): void {
    this.navigateWithExit('/register', event);
  }

  private navigateWithExit(url: string, event: MouseEvent): void {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (this.isNavigating) return;
    this.isNavigating = true;

    const navigate = (): void => {
      void this.router.navigateByUrl(url);
    };
    const form = this.host.nativeElement.querySelector<HTMLElement>('[data-auth-form]');
    if (
      !form ||
      typeof window === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      navigate();
      return;
    }

    gsap.to(form, {
      autoAlpha: 0,
      y: -5,
      filter: 'blur(7px)',
      duration: 0.18,
      ease: 'power1.in',
      onComplete: navigate,
    });
  }
}
