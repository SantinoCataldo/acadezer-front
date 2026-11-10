import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthHero } from '../auth-hero/auth-hero';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterLink, RouterOutlet, AuthHero],
  host: { class: 'block min-h-dvh w-full' },
  templateUrl: './auth-layout.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayout {}
