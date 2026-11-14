import { NOTA_APROBADA_MIN } from './models';
import type { EvaluacionResponse } from './models';

export type EstadoCursada = 'PROMOCIONADO' | 'REGULAR' | 'DESAPROBADO' | 'PENDIENTE';

export interface PromedioMateria {
  promedio: number | null;
  estado: EstadoCursada;
  evaluadas: number;
  desaprobadas: number;
}

export const PROMEDIO_PROMOCION_MIN = 8;

export const PROMEDIO_REGULAR_MIN = 6;

export function estaAprobada(evaluacion: EvaluacionResponse): boolean {
  return evaluacion.calificacion !== null && evaluacion.calificacion >= NOTA_APROBADA_MIN;
}

export function calcularPromedio(evaluaciones: readonly EvaluacionResponse[]): PromedioMateria {
  const conNota = evaluaciones.filter((evaluacion) => evaluacion.calificacion !== null);
  if (conNota.length === 0) {
    return { promedio: null, estado: 'PENDIENTE', evaluadas: 0, desaprobadas: 0 };
  }

  const suma = conNota.reduce((total, evaluacion) => total + (evaluacion.calificacion ?? 0), 0);
  const desaprobadas = conNota.filter((evaluacion) => !estaAprobada(evaluacion)).length;
  const promedio = Number((suma / conNota.length).toFixed(1));

  const estado: EstadoCursada =
    desaprobadas > 0 || promedio < PROMEDIO_REGULAR_MIN
      ? 'DESAPROBADO'
      : promedio >= PROMEDIO_PROMOCION_MIN
        ? 'PROMOCIONADO'
        : 'REGULAR';

  return { promedio, estado, evaluadas: conNota.length, desaprobadas };
}

export const ETIQUETA_ESTADO_CURSADA: Record<EstadoCursada, string> = {
  PROMOCIONADO: 'Promocionado',
  REGULAR: 'Regular',
  DESAPROBADO: 'Desaprobado',
  PENDIENTE: 'Sin notas',
};

export function detalleEstadoCursada(resumen: PromedioMateria): string {
  switch (resumen.estado) {
    case 'PROMOCIONADO':
      return `Promedio ${resumen.promedio} con todas las evaluaciones aprobadas.`;
    case 'REGULAR':
      return `Promedio ${resumen.promedio}: aprobás la materia, pero no promociona.`;
    case 'DESAPROBADO':
      return resumen.desaprobadas > 0
        ? `${resumen.desaprobadas} ${resumen.desaprobadas === 1 ? 'evaluación' : 'evaluaciones'} por debajo de ${NOTA_APROBADA_MIN}.`
        : `Promedio ${resumen.promedio}: no llega a ${PROMEDIO_REGULAR_MIN}.`;
    case 'PENDIENTE':
      return 'Todavía no cargaste ninguna nota.';
  }
}
