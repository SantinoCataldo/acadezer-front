import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { environment } from '../../../../../environments/environment';
import { DatePicker } from '../../../../components/ui/date-picker/date-picker';
import type { EvaluacionResponse } from '../../models';
import { EvaluacionFormDialog } from './evaluacion-form-dialog';

describe('EvaluacionFormDialog', () => {
  let requests: HttpTestingController;
  let fixture: ComponentFixture<EvaluacionFormDialog>;

  const materia = { id: 3, nombre: 'Biología' };
  const materias = [
    { id: 3, nombre: 'Biología' },
    { id: 4, nombre: 'Matemática' },
  ];

  const guardada: EvaluacionResponse = {
    id: 44,
    materiaId: 3,
    nombre: 'Primer parcial',
    fecha: '2026-10-02',
    calificacion: 7,
  };

  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );

    TestBed.configureTestingModule({
      imports: [EvaluacionFormDialog],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    requests = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EvaluacionFormDialog);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  function open(evaluacion: EvaluacionResponse | null = null): void {
    fixture.componentRef.setInput('materia', materia);
    fixture.componentRef.setInput('materias', materias);
    fixture.componentRef.setInput('evaluacion', evaluacion);
    fixture.detectChanges();
  }

  function nombreInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('#evaluacion-nombre input') as HTMLInputElement;
  }

  function notaInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('#evaluacion-nota input') as HTMLInputElement;
  }

  function pickFecha(iso: string): void {
    const picker = fixture.debugElement.query(By.directive(DatePicker)).componentInstance as DatePicker;

    (fixture.nativeElement.querySelector('#evaluacion-fecha button') as HTMLButtonElement).click();
    fixture.detectChanges();

    const [year, month] = iso.split('-').map(Number);
    for (let step = 0; step < 24; step++) {
      const shown = picker.currentMonth();
      if (shown.year === year && shown.month === month) break;
      if (shown.year < year || (shown.year === year && shown.month < month)) {
        picker.nextMonth(new MouseEvent('click'));
      } else {
        picker.prevMonth(new MouseEvent('click'));
      }
      fixture.detectChanges();
    }

    const celda = Array.from(
      fixture.nativeElement.querySelectorAll('.grid button') as NodeListOf<HTMLButtonElement>,
    ).find((boton) => boton.getAttribute('data-date') === iso);
    celda?.click();
    fixture.detectChanges();
  }

  function submit(): void {
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  function fillBase(): void {
    const input = nombreInput();
    input.value = 'Primer parcial';
    input.dispatchEvent(new Event('input'));
    fixture.componentInstance.form.controls.fecha.setValue('2026-10-02');
    fixture.detectChanges();
  }

  it('starts empty and asks for evaluation details without mandatory nota', () => {
    open();
    expect(fixture.componentInstance.editing()).toBe(false);
    expect(nombreInput().value).toBe('');
    expect(notaInput().value).toBe('');
    expect(fixture.nativeElement.textContent).toContain('Nueva evaluación');
  });

  it('prefills the dialog with the evaluation being edited', () => {
    open(guardada);
    fixture.detectChanges();

    expect(fixture.componentInstance.form.controls.nombre.value).toBe('Primer parcial');
    expect(fixture.componentInstance.form.controls.fecha.value).toBe('2026-10-02');
    expect(fixture.componentInstance.form.controls.nota.value).toBe('7');
    expect(fixture.nativeElement.textContent).toContain('Editar evaluación');
  });

  it('sends the nota as calificacion number', () => {
    open();
    fillBase();

    notaInput().value = '8.5';
    notaInput().dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.nota.value).toBe('8.5');

    submit();

    const request = requests.expectOne(`${environment.apiUrl}/api/materias/3/evaluaciones`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      nombre: 'Primer parcial',
      fecha: '2026-10-02',
      calificacion: 8.5,
    });
    request.flush(guardada);
    fixture.detectChanges();

    requests.verify();
  });

  it('accepts a nota written with a decimal comma', () => {
    open();
    fillBase();
    const nota = notaInput();
    nota.value = '7,25';
    nota.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.form.controls.nota.value).toBe('7,25');

    submit();

    const request = requests.expectOne(`${environment.apiUrl}/api/materias/3/evaluaciones`);
    expect(request.request.body).toEqual({
      nombre: 'Primer parcial',
      fecha: '2026-10-02',
      calificacion: 7.25,
    });
    requests.verify();
  });

  it('keeps calificacion null when nota is left empty', () => {
    open();
    fillBase();
    submit();

    const request = requests.expectOne(`${environment.apiUrl}/api/materias/3/evaluaciones`);
    expect(request.request.body).toEqual({
      nombre: 'Primer parcial',
      fecha: '2026-10-02',
      calificacion: null,
    });
    requests.verify();
  });

  it('rejects a nota outside 0 a 10 without sending anything', () => {
    open();
    fillBase();

    const nota = notaInput();
    nota.value = '11';
    nota.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    submit();

    expect(fixture.nativeElement.textContent).toContain('La nota va de 0 a 10');
    requests.expectNone(`${environment.apiUrl}/api/materias/3/evaluaciones`);
    requests.verify();
  });

  it('requires the nombre before sending', () => {
    open();

    (
      fixture.nativeElement.querySelector('#evaluacion-nombre input') as HTMLInputElement
    ).dispatchEvent(new Event('input'));
    fixture.detectChanges();
    submit();

    expect(fixture.nativeElement.textContent).toContain('El nombre es obligatorio.');
    requests.expectNone(`${environment.apiUrl}/api/materias/3/evaluaciones`);
    requests.verify();
  });

  it('updates the evaluation instead of creating a new one', () => {
    open(guardada);
    fixture.detectChanges();
    submit();

    const request = requests.expectOne(`${environment.apiUrl}/api/evaluaciones/44`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      nombre: 'Primer parcial',
      fecha: '2026-10-02',
      calificacion: 7,
    });
    request.flush(guardada);
    fixture.detectChanges();

    requests.verify();
  });

  it('keeps the dialog open with the error when the save fails', () => {
    open();
    fillBase();
    submit();

    requests
      .expectOne(`${environment.apiUrl}/api/materias/3/evaluaciones`)
      .flush(
        { message: 'No se pudo guardar la evaluación' },
        { status: 500, statusText: 'Server Error' },
      );
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('No se pudo guardar la evaluación');
    expect(fixture.componentInstance.form.controls.nombre.value.trim()).toBe('Primer parcial');
    requests.verify();
  });
});
