import { Pipe, PipeTransform, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';

@Pipe({
  name: 'authImage',
  standalone: true
})
export class AuthImagePipe implements PipeTransform {
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);

  transform(imageId: number | string | null | undefined): Observable<SafeUrl | string> {
    if (!imageId) {
      return of('');
    }

    const url = `${environment.apiUrl}/archivos/${imageId}`;

    return this.http.get(url, { responseType: 'blob' }).pipe(
      map((blob) => {
        const objectUrl = URL.createObjectURL(blob);
        return this.sanitizer.bypassSecurityTrustUrl(objectUrl);
      }),
      catchError(() => of(''))
    );
  }
}
