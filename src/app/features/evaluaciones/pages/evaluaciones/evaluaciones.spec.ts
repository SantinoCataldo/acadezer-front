import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import type { EvaluacionResponse } from '../../models';
import { Evaluaciones } from './evaluaciones';

@Component({ selector: 'app-route-stub', template: '' })
class RouteStub {}

describe('Evaluaciones', () => {
  let requests: HttpTestingController;
  let fixture: ComponentFixture<Evaluaciones>;

  const materias = [
    { id: 1, nombre: 'Análisis matemático', descripcion: null },
    { id: 2, nombre: 'Algoritmos', descripcion: null },
  ];

  function fecha(diasHaciaElFuturo: number): string {
    const date = new Date();
    date.setDate(date.getDate() + diasHaciaElFuturo);
    return date.toISOString().slice(0, 10);
  }

  const parcial: EvaluacionResponse = {
    id: 11,
    materiaId: 1,
    nombre: 'Primer parcial',
    fecha: fecha(6),
    calificacion: null,
  };

  const final: EvaluacionResponse = {
    id: 22,
    materiaId: 1,
    nombre: 'Final',
    fecha: fecha(-9),
    calificacion: 8,
  };

  const recuperatorio: EvaluacionResponse = {
    id: 33,
    materiaId: 2,
    nombre: 'Recuperatorio',
    fecha: fecha(-2),
    calificacion: 4,
  };

  beforeEach(() => {
    vi.stubGlobal('matchMedia', (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    TestBed.configureTestingModule({
      imports: [Evaluaciones],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'estudio', component: RouteStub },
          { path: 'estudio/evaluaciones', component: RouteStub },
        ]),
      ],
    });
    requests = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });

  function open(): void {
    fixture = TestBed.createComponent(Evaluaciones);
    fixture.detectChanges();
  }

  function flushAll(porMateria: Record<number, readonly EvaluacionResponse[]> = {}): void {
    requests.expectOne(`${environment.apiUrl}/api/materias`).flush(materias);
    for (const materia of materias) {
      requests
        .expectOne(`${environment.apiUrl}/api/materias/${materia.id}/evaluaciones`)
        .flush([...(porMateria[materia.id] ?? [])]);
    }
    fixture.detectChanges();
  }

  function buttonWith(text: string): HTMLButtonElement {
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    );
    return buttons.find((button) => button.textContent?.includes(text)) as HTMLButtonElement;
  }

  function iconButton(label: string): HTMLButtonElement {
    return fixture.nativeElement.querySelector(
      `button[aria-label="${label}"]`,
    ) as HTMLButtonElement;
  }

  it('shows the loading state before the first response', () => {
    open();

    expect(fixture.nativeElement.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Cargando evaluaciones…');

    flushAll();
    expect(fixture.nativeElement.querySelector('[aria-busy="true"]')).toBeNull();
    requests.verify();
  });

  it('groups the evaluations into próximas and rendidas (EVA-03)', () => {
    open();
    flushAll({
      1: [parcial, final],
      2: [recuperatorio],
    });

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Próximas');
    expect(text).toContain('Rendidas');
    expect(text).toContain('Primer parcial');
    expect(text).toContain('Final');
    expect(text).toContain('Recuperatorio');
    expect(text).toContain('Pendiente');
    expect(text).toContain('Rendida');
    expect(text).toContain('Análisis matemático');
    expect(text).toContain('Algoritmos');
    requests.verify();
  });

  it('shows the promedio of the subject when filtered', () => {
    open();
    flushAll({
      1: [parcial, final],
      2: [recuperatorio],
    });

    fixture.componentInstance.filtroMateriaId.set(1);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('8');
    expect(text).toContain('Análisis matemático');
    expect(text).toContain('Primer parcial');
    expect(text).toContain('Final');
    expect(text).not.toContain('Recuperatorio');
    requests.verify();
  });

  it('filters evaluations by status pill', () => {
    open();
    flushAll({
      1: [parcial, final],
      2: [recuperatorio],
    });

    fixture.componentInstance.filtroEstado.set('rendidas');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Final');
    expect(text).toContain('Recuperatorio');
    expect(text).not.toContain('Primer parcial');
    requests.verify();
  });

  it('asks the subjects first and explains the order when there are none', () => {
    open();
    requests.expectOne(`${environment.apiUrl}/api/materias`).flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Todavía no creaste materias');
    requests.expectNone(`${environment.apiUrl}/api/materias/1/evaluaciones`);
    requests.verify();
  });

  it('shows the empty state when no subject has evaluations yet', () => {
    open();
    flushAll();

    expect(fixture.nativeElement.textContent).toContain('Todavía no cargaste evaluaciones');
    requests.verify();
  });

  it('shows the error state and allows retrying', () => {
    open();
    requests
      .expectOne(`${environment.apiUrl}/api/materias`)
      .flush(
        { message: 'Servicio no disponible' },
        { status: 503, statusText: 'Service Unavailable' },
      );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No pudimos cargar tus evaluaciones.');

    buttonWith('Reintentar').click();
    flushAll({ 1: [final] });

    expect(fixture.nativeElement.textContent).toContain('Final');
    requests.verify();
  });

  it('keeps listing when the evaluations of one subject fail', () => {
    open();
    requests.expectOne(`${environment.apiUrl}/api/materias`).flush(materias);
    requests
      .expectOne(`${environment.apiUrl}/api/materias/1/evaluaciones`)
      .flush({ message: 'sin servicio' }, { status: 500, statusText: 'Server Error' });
    requests.expectOne(`${environment.apiUrl}/api/materias/2/evaluaciones`).flush([recuperatorio]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Recuperatorio');
    expect(fixture.nativeElement.querySelector('[aria-busy="true"]')).toBeNull();
    requests.verify();
  });

  it('creates an evaluation and shows it without reloading the list', () => {
    open();
    flushAll();

    buttonWith('Nueva evaluación').click();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.textContent).toContain('Nueva evaluación');
    expect(dialog.textContent).toContain('Análisis matemático');

    (fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    requests.expectNone(`${environment.apiUrl}/api/materias/1/evaluaciones`);
    requests.verify();
  });

  it('edits an evaluation from the list', () => {
    open();
    flushAll({ 1: [final] });

    iconButton('Editar Final').click();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialog.textContent).toContain('Editar evaluación');
    expect(dialog.textContent).toContain('Análisis matemático');

    requests.verify();
  });

  it('deletes an evaluation and drops it from the list', () => {
    open();
    flushAll({ 1: [final] });

    iconButton('Eliminar Final').click();
    fixture.detectChanges();

    buttonWith('Eliminar evaluación').click();
    const request = requests.expectOne(`${environment.apiUrl}/api/evaluaciones/22`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Final');
    expect(fixture.nativeElement.textContent).toContain('Todavía no cargaste evaluaciones');
    requests.verify();
  });

  it('shows pending evaluation with Sin nota and allows updating', () => {
    open();
    flushAll({ 1: [parcial] });

    expect(fixture.nativeElement.textContent).toContain('Sin nota');
    expect(fixture.nativeElement.textContent).toContain('Pendiente');

    fixture.componentInstance.iniciarEdicionNotaRapida(11);
    fixture.detectChanges();

    fixture.componentInstance.guardarNotaRapida(parcial, '7.5');
    const updateReq = requests.expectOne(`${environment.apiUrl}/api/evaluaciones/11`);
    expect(updateReq.request.method).toBe('PUT');
    expect(updateReq.request.body).toEqual({
      nombre: 'Primer parcial',
      fecha: parcial.fecha,
      calificacion: 7.5,
    });
    updateReq.flush({ ...parcial, calificacion: 7.5 });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('7.5');
    expect(fixture.nativeElement.textContent).toContain('Rendida');
    requests.verify();
  });

  it('switches between list and grid views', () => {
    open();
    flushAll({ 1: [final] });

    expect(fixture.componentInstance.vista()).toBe('lista');

    fixture.componentInstance.vista.set('grilla');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('article')).not.toBeNull();
    requests.verify();
  });
});
