import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-study-space',
  imports: [],
  templateUrl: './estudio.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudySpaceComponent {
  private readonly auth = inject(AuthService);
  readonly currentUser = this.auth.currentUser;

  logout(): void {
    this.auth.logout();
  }
}
