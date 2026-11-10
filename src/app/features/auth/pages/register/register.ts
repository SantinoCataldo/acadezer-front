import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { switchMap, tap } from 'rxjs';
import { TextField } from '@components/ui/text-field/text-field';
import { AuthService } from '@core/services/auth.service';
import { AuthHero } from '@features/auth/components/auth-hero/auth-hero';
import { AuthFormReveal } from '@features/auth/directives/auth-form-reveal.directive';
import { authAppearance } from '@features/auth/auth-theme';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, TextField, AuthHero, AuthFormReveal],
  templateUrl: './register.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly appearance = authAppearance;
  readonly registered = signal(false);
  readonly autoLoginPending = signal(false);
  readonly autoLoginFailed = signal(false);
  readonly step = signal<1 | 2>(1);
  readonly action = this.auth.registerAction;

  readonly form = inject(NonNullableFormBuilder).group({
    nombre: ['', [Validators.required, Validators.pattern(/\S/)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    password: ['', [Validators.required, Validators.maxLength(72)]],
    confirmPassword: ['', Validators.required],
  });

  nameErrorMessage(): string | null {
    const control = this.form.controls.nombre;
    if (!control.touched || !control.invalid) return null;
    return 'Ingresá tu nombre.';
  }

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

    if (this.form.controls.nombre.invalid || this.form.controls.email.invalid) return;

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
          void this.router.navigateByUrl('/');
        },
        error: () => {
          this.autoLoginPending.set(false);
          if (this.registered()) {
            this.form.controls.password.reset();
            this.form.controls.confirmPassword.reset();
            this.autoLoginFailed.set(true);
          }
        },
      });
  }
}
