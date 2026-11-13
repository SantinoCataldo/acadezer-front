import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { environment } from '../../../../../environments/environment';
import { DatePicker } from '../../../../components/ui/date-picker/date-picker';
import type { EvaluacionResponse } from '../../models';
import { EvaluacionFormDialog } from './evaluacion-form-dialog';

describe('EvaluacionFormDialog', () => {
  let requests: HttpTestingController;
  let fixture: ComponentFixture<EvaluacionFormDialog>;

  const materia = { id: 3, nombre: 'Biología' };

  const guardada: EvaluacionResponse = {
    id: 44,
    materiaId: 3,
    nombre: 'Primer parcial',
    fecha: '2026-10-02',
    tipo: 'PARCIAL_1',
    estado: 'APROBADO',
    calificacion: 7,
  };

  function open(evaluacion: EvaluacionResponse | null = null): void {
    fixture.componentRef.setInput('materia', materia);
    fixture.componentRef.setInput('evaluacion', evaluacion);
    fixture.detectChanges();
  }

  function select(id: string, value: string): void {
    const control = fixture.nativeElement.querySelector(`select#${id}`) as HTMLSelectElement;
    control.value = value;
    control.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function nombreInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('#evaluacion-nombre input') as HTMLInputElement;
  }

  function notaInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('#evaluacion-nota input') as HTMLInputElement;
  }

  function pickFecha(iso: string): void {
    const picker = fixture.debugElement.query(By.directive(DatePicker))
      .componentInstance as DatePicker;

    (fixture.nativeElement.querySelector('#evaluacion-fecha button') as HTMLButtonElement).click();
    fixture.detectChanges();

    const [year, month] = iso.split('-').map(Number);
    for (let step = 0; step < 24; step++) {
      const shown = picker.currentMonth();
      if (shown.year === year && shown.month === month) break;
      (fixture.nativeElement.querySelector('button[aria-label="Mes anterior"]') as HTMLButtonElement).click();
      fixture.detectChanges();
    }

    const day = Number(iso.slice(8));
    const cell = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.trim() === String(day)) as HTMLButtonElement;
    cell.click();
    fixture.detectChanges();
  }

  function submit(): void {
    (fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  function fillBase(): void {
    const nombre = nombreInput();
    nombre.value = ' Primer parcial ';
    nombre.dispatchEvent(new Event('input'));

    pickFecha('2026-10-02');
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EvaluacionFormDialog, FormsModule],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    requests = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EvaluacionFormDialog);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('starts empty and asks for the pending evaluation, without nota', () => {
    open();

    expect(fixture.componentInstance.form.controls.nombre.value).toBe('');
    expect(fixture.componentInstance.form.controls.estado.value).toBe('PENDIENTE');
    expect(fixture.componentInstance.pideNota()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Nueva evaluación');
  });

  it('prefills the dialog with the evaluation being edited (EVA-02)', () => {
    open(guardada);
    fixture.detectChanges();

    expect(fixture.componentInstance.form.controls.nombre.value).toBe('Primer parcial');
    expect(fixture.componentInstance.form.controls.fecha.value).toBe('2026-10-02');
    expect(fixture.componentInstance.form.controls.tipo.value).toBe('PARCIAL_1');
    expect(fixture.componentInstance.form.controls.estado.value).toBe('APROBADO');
    expect(fixture.componentInstance.form.controls.nota.value).toBe('7');
    expect(fixture.componentInstance.pideNota()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Editar evaluación');
  });

  it('sends the nota and derives the estado from it', () => {
    open();
    fillBase();

    notaInput().value = '8.5';
    notaInput().dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.estado.value).toBe('APROBADO');
    expect(fixture.componentInstance.form.controls.nota.value).toBe('8.5');

    submit();

    const request = requests.expectOne(`${environment.apiUrl}/api/materias/3/evaluaciones`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      nombre: 'Primer parcial',
      fecha: '2026-10-02',
      tipo: 'PARCIAL_1',
      estado: 'APROBADO',
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
    expect(fixture.componentInstance.form.controls.estado.value).toBe('APROBADO');

    submit();

    const request = requests.expectOne(`${environment.apiUrl}/api/materias/3/evaluaciones`);
    expect(request.request.body).toMatchObject({ calificacion: 7.25, estado: 'APROBADO' });
    requests.verify();
  });

  it('keeps the nota null while the evaluation is pending', () => {
    open();
    fillBase();
    submit();

    const request = requests.expectOne(`${environment.apiUrl}/api/materias/3/evaluaciones`);
    expect(request.request.body).toEqual({
      nombre: 'Primer parcial',
      fecha: '2026-10-02',
      tipo: 'PARCIAL_1',
      estado: 'PENDIENTE',
      calificacion: null,
    });
    requests.verify();
  });

  it('clears the nota when the estado goes back to pendiente', () => {
    open(guardada);
    fixture.detectChanges();

    select('evaluacion-estado', 'PENDIENTE');

    expect(fixture.componentInstance.form.controls.nota.value).toBe('');
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
