import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../../environments/environment';
import type { SubjectResponse } from '../../models';
import { DeleteSubjectDialog } from './delete-subject-dialog';

describe('DeleteSubjectDialog', () => {
  let requests: HttpTestingController;
  let fixture: ComponentFixture<DeleteSubjectDialog>;

  const subject: SubjectResponse = { id: 7, nombre: 'Física', fechaInicio: null, fechaFin: null, horarios: [] };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DeleteSubjectDialog],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    requests = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  function open(): void {
    fixture = TestBed.createComponent(DeleteSubjectDialog);
    fixture.componentRef.setInput('subject', subject);
    fixture.detectChanges();
  }

  function buttonWith(text: string): HTMLButtonElement {
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>);
    return buttons.find((button) => button.textContent?.includes(text)) as HTMLButtonElement;
  }

  it('explains that notes, tasks, exams and attendance are deleted too', () => {
    open();
    expect(fixture.nativeElement.textContent).toContain(
      'también se borran sus apuntes, pendientes, evaluaciones y asistencias',
    );
    requests.verify();
  });

  it('emits cancelled without any request when declining', () => {
    open();
    const cancelled = vi.fn();
    fixture.componentInstance.cancelled.subscribe(cancelled);

    buttonWith('Cancelar').click();

    expect(cancelled).toHaveBeenCalled();
    requests.expectNone(`${environment.apiUrl}/api/materias/7`);
    requests.verify();
  });

  it('deletes the subject and reports the result on success', () => {
    open();
    const deleted = vi.fn();
    fixture.componentInstance.deleted.subscribe(deleted);

    buttonWith('Eliminar materia').click();
    requests
      .expectOne(`${environment.apiUrl}/api/materias/7`)
      .flush(null, { status: 204, statusText: 'No Content' });

    expect(deleted).toHaveBeenCalled();
    requests.verify();
  });

  it('stays open with the error when the deletion fails', () => {
    open();
    const deleted = vi.fn();
    fixture.componentInstance.deleted.subscribe(deleted);

    buttonWith('Eliminar materia').click();
    requests
      .expectOne(`${environment.apiUrl}/api/materias/7`)
      .flush({ message: 'No se pudo eliminar la materia' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(deleted).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('No se pudo eliminar la materia');
    expect(buttonWith('Eliminar materia').disabled).toBe(false);
    requests.verify();
  });
});
