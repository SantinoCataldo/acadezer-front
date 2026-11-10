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
import { AuthService } from '@core/services/auth.service';
import { TextField } from '@components/ui/text-field/text-field';
import { AuthHero } from '@features/auth/components/auth-hero/auth-hero';
import { AuthFormReveal } from '@features/auth/directives/auth-form-reveal.directive';
import { authAppearance } from '@features/auth/auth-theme';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, TextField, AuthHero, AuthFormReveal],
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
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
          void this.router.navigateByUrl('/');
        },
        error: () => undefined,
      });
  }
}
