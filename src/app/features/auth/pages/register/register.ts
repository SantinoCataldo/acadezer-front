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
import { HttpErrorResponse } from '@angular/common/http';
import { switchMap, tap } from 'rxjs';
import { gsap } from 'gsap';
import { TextField } from '@components/ui/text-field/text-field';
import { AuthService } from '@core/services/auth.service';
import { AuthFormReveal } from '@features/auth/directives/auth-form-reveal.directive';
import { authAppearance } from '@features/auth/auth-theme';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, TextField, AuthFormReveal],
  host: { class: 'block w-full' },
  templateUrl: './register.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private isNavigating = false;

  readonly appearance = authAppearance;
  readonly registered = signal(false);
  readonly autoLoginPending = signal(false);
  readonly autoLoginFailed = signal(false);
  readonly emailAlreadyRegistered = signal(false);
  readonly step = signal<1 | 2>(1);
  readonly action = this.auth.registerAction;

  readonly form = inject(NonNullableFormBuilder).group({
    nombre: ['', [Validators.required, Validators.pattern(/\S/)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    password: ['', [Validators.required, Validators.maxLength(72)]],
    confirmPassword: ['', Validators.required],
  });

  constructor() {
    this.form.controls.email.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.emailAlreadyRegistered.set(false));
  }

  nameErrorMessage(): string | null {
    const control = this.form.controls.nombre;
    if (!control.touched || !control.invalid) return null;
    return 'Ingresá tu nombre.';
  }

  emailErrorMessage(): string | null {
    const control = this.form.controls.email;
    if (this.emailAlreadyRegistered()) return 'Este correo ya está registrado. Iniciá sesión o usá otro.';
    if (!control.touched || !control.invalid) return null;
    if (control.hasError('required')) return 'Ingresá tu correo electrónico.';
    if (control.hasError('maxlength')) return 'El correo supera el máximo permitido.';
    return 'Revisá el formato del correo electrónico.';
  }

  passwordErrorMessage(): string | null {
    const control = this.form.controls.password;
    if (!control.touched || !control.invalid) return null;
    if (control.hasError('required')) return 'Ingresá una contraseña.';
    return 'La contraseña supera el máximo permitido.';
  }

  confirmationErrorMessage(): string | null {
    const control = this.form.controls.confirmPassword;
    if (!control.touched) return null;
    if (control.hasError('required')) return 'Repetí tu contraseña.';
    if (this.passwordsDoNotMatch()) return 'Las contraseñas no coinciden.';
    return null;
  }

  passwordsDoNotMatch(): boolean {
    return this.form.controls.password.value !== this.form.controls.confirmPassword.value;
  }

  goToPasswordStep(): void {
    this.form.controls.nombre.markAsTouched();
    this.form.controls.email.markAsTouched();

    if (
      this.emailAlreadyRegistered() ||
      this.form.controls.nombre.invalid ||
      this.form.controls.email.invalid
    ) return;

    this.step.set(2);
  }

  goToDetailsStep(): void {
    this.step.set(1);
  }

  handleSubmit(): void {
    if (this.step() === 1) {
      this.goToPasswordStep();
      return;
    }

    if (this.action.disabled()) return;

    this.form.controls.password.markAsTouched();
    this.form.controls.confirmPassword.markAsTouched();

    if (
      this.form.controls.password.invalid ||
      this.form.controls.confirmPassword.invalid ||
      this.passwordsDoNotMatch()
    ) return;

    const { nombre, email, password } = this.form.getRawValue();

    const normalizedEmail = email.trim();
    this.auth
      .register({ nombre: nombre.trim(), email: normalizedEmail, password })
      .pipe(
        tap(() => {
          this.registered.set(true);
          this.autoLoginPending.set(true);
        }),
        switchMap(() => this.auth.login({ email: normalizedEmail, password })),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.autoLoginPending.set(false);
          this.form.controls.password.reset();
          this.form.controls.confirmPassword.reset();
          void this.router.navigateByUrl('/onboarding');
        },
        error: (error: unknown) => {
          this.autoLoginPending.set(false);
          if (this.registered()) {
            this.form.controls.password.reset();
            this.form.controls.confirmPassword.reset();
            this.autoLoginFailed.set(true);
            return;
          }

          if (error instanceof HttpErrorResponse && error.status === 409) {
            this.emailAlreadyRegistered.set(true);
            this.form.controls.email.markAsTouched();
            this.form.controls.password.reset();
            this.form.controls.confirmPassword.reset();
            this.step.set(1);
          }
        },
      });
  }

  navigateToLogin(event: MouseEvent): void {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (this.isNavigating) return;
    this.isNavigating = true;

    const navigate = (): void => {
      void this.router.navigateByUrl('/login');
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
