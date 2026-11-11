import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '@core/services/auth.service';
import { SubjectList } from '@features/subjects';

@Component({
  selector: 'app-study-space',
  imports: [SubjectList],
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
