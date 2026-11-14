import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../../environments/environment';
import type { SubjectResponse } from '../../models';
import { NOMBRE_MAX, SubjectFormDialog } from './subject-form-dialog';

describe('SubjectFormDialog', () => {
  let requests: HttpTestingController;
  let fixture: ComponentFixture<SubjectFormDialog>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SubjectFormDialog],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    requests = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  function open(subject: SubjectResponse | null = null): void {
    fixture = TestBed.createComponent(SubjectFormDialog);
    fixture.componentRef.setInput('subject', subject);
    fixture.detectChanges();
  }

  function fillNombre(value: string): void {
    const input = fixture.nativeElement.querySelector('app-text-field input') as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function fillDescripcion(value: string): void {
    const textarea = fixture.nativeElement.querySelector('textarea#subject-descripcion') as HTMLTextAreaElement;
    textarea.value = value;
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function submit(): void {
    const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
  }

  it('blocks the submit and reports the missing name', () => {
    open();
    submit();

    requests.expectNone(`${environment.apiUrl}/api/materias`);
    expect(fixture.nativeElement.textContent).toContain('El nombre es obligatorio.');
    requests.verify();
  });

  it(`rejects a name longer than ${NOMBRE_MAX} characters`, () => {
    open();
    fillNombre('a'.repeat(NOMBRE_MAX + 1));
    submit();

    requests.expectNone(`${environment.apiUrl}/api/materias`);
    expect(fixture.nativeElement.textContent).toContain(`no puede superar los ${NOMBRE_MAX} caracteres`);
    requests.verify();
  });

  it('creates a subject with the trimmed name and a null empty description', () => {
    open();
    const saved = vi.fn();
    fixture.componentInstance.saved.subscribe(saved);

    fillNombre('  Análisis matemático  ');
    fillDescripcion('   ');
    submit();

    const request = requests.expectOne(`${environment.apiUrl}/api/materias`);
    expect(request.request.body).toEqual({ nombre: 'Análisis matemático', descripcion: null });
    request.flush({ id: 9, nombre: 'Análisis matemático', descripcion: null });

    expect(saved).toHaveBeenCalledWith({ id: 9, nombre: 'Análisis matemático', descripcion: null });
    requests.verify();
  });

  it('prefills the form and updates with PUT when editing', () => {
    open({ id: 7, nombre: 'Física', descripcion: 'Primer año' });
    const saved = vi.fn();
    fixture.componentInstance.saved.subscribe(saved);

    const nombre = fixture.nativeElement.querySelector('app-text-field input') as HTMLInputElement;
    const descripcion = fixture.nativeElement.querySelector('textarea#subject-descripcion') as HTMLTextAreaElement;
    expect(nombre.value).toBe('Física');
    expect(descripcion.value).toBe('Primer año');

    fillNombre('Física II');
    submit();

    const request = requests.expectOne(`${environment.apiUrl}/api/materias/7`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ nombre: 'Física II', descripcion: 'Primer año' });
    request.flush({ id: 7, nombre: 'Física II', descripcion: 'Primer año' });

    expect(saved).toHaveBeenCalledWith({ id: 7, nombre: 'Física II', descripcion: 'Primer año' });
    requests.verify();
  });

  it('keeps the dialog open with the server error when saving fails', () => {
    open();
    fillNombre('Química');
    submit();

    const request = requests.expectOne(`${environment.apiUrl}/api/materias`);
    request.flush(
      { message: 'La descripción supera el máximo permitido' },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('La descripción supera el máximo permitido');
    const nombre = fixture.nativeElement.querySelector('app-text-field input') as HTMLInputElement;
    expect(nombre.value).toBe('Química');
    requests.verify();
  });
});
