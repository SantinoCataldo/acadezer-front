import { calcularPromedio, detalleEstadoCursada, estaAprobada } from './promedio';
import type { EvaluacionResponse } from './models';

function evaluacion(calificacion: number | null, id = 1): EvaluacionResponse {
  return {
    id,
    nombre: `Evaluación ${id}`,
    fecha: '2026-11-10',
    calificacion,
    tipo: 'PARCIAL_1',
    estado: calificacion === null
      ? 'PENDIENTE'
      : calificacion >= 6
        ? 'APROBADO'
        : 'DESAPROBADO',
    materiaId: 7,
  };
}

describe('calcularPromedio', () => {
  it('queda sin notas cuando no hay ninguna evaluación cargada', () => {
    const resumen = calcularPromedio([]);
    expect(resumen.promedio).toBeNull();
    expect(resumen.estado).toBe('PENDIENTE');
    expect(detalleEstadoCursada(resumen)).toContain('Todavía no cargaste');
  });

  it('ignora las evaluaciones pendientes en el promedio', () => {
    const resumen = calcularPromedio([evaluacion(8, 1), evaluacion(6, 2), evaluacion(null, 3)]);
    expect(resumen.promedio).toBe(7);
    expect(resumen.evaluadas).toBe(2);
    expect(resumen.estado).toBe('REGULAR');
  });

  it('promociona con promedio de 8 o más y todo aprobado', () => {
    expect(calcularPromedio([evaluacion(8, 1), evaluacion(8, 2)]).estado).toBe('PROMOCIONADO');
    expect(calcularPromedio([evaluacion(10, 1), evaluacion(9, 2)]).estado).toBe('PROMOCIONADO');
    expect(calcularPromedio([evaluacion(9, 1), evaluacion(8, 2), evaluacion(7, 3)]).promedio).toBe(
      8,
    );
  });

  it('queda regular con promedio entre 6 y 8 y todo aprobado', () => {
    const resumen = calcularPromedio([evaluacion(6, 1), evaluacion(6, 2)]);
    expect(resumen.estado).toBe('REGULAR');
    expect(detalleEstadoCursada(resumen)).toContain('no promociona');
  });

  it('desaprueba la materia si una nota queda bajo 6, aunque el promedio sea alto', () => {
    const resumen = calcularPromedio([evaluacion(10, 1), evaluacion(10, 2), evaluacion(1, 3)]);
    expect(resumen.promedio).toBe(7);
    expect(resumen.estado).toBe('DESAPROBADO');
    expect(resumen.desaprobadas).toBe(1);
    expect(detalleEstadoCursada(resumen)).toContain('por debajo de 6');
  });

  it('explica el promedio cuando no hay ninguna nota individual baja', () => {
    const resumen = {
      promedio: 5.8,
      estado: 'DESAPROBADO' as const,
      evaluadas: 2,
      desaprobadas: 0,
    };
    expect(detalleEstadoCursada(resumen)).toContain('no llega a 6');
  });

  it('una materia con todas las notas aprobadas nunca queda desaprobada', () => {
    const resumen = calcularPromedio([evaluacion(6, 1), evaluacion(6, 2)]);
    expect(resumen.estado).toBe('REGULAR');
    expect(resumen.desaprobadas).toBe(0);
  });

  it('redondea el promedio a un decimal', () => {
    expect(calcularPromedio([evaluacion(7, 1), evaluacion(6, 2), evaluacion(8, 3)]).promedio).toBe(
      7,
    );
    expect(calcularPromedio([evaluacion(7.25, 1), evaluacion(6.5, 2)]).promedio).toBe(6.9);
  });
});

describe('estaAprobada', () => {
  it('aprueba justo en el 6', () => {
    expect(estaAprobada(evaluacion(6))).toBe(true);
    expect(estaAprobada(evaluacion(5.99))).toBe(false);
    expect(estaAprobada(evaluacion(null))).toBe(false);
  });
});
