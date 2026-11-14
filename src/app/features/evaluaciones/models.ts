export const EVALUACION_NOMBRE_MAX_LENGTH = 200;
export const EVALUACION_CALIFICACION_MIN = 0;
export const EVALUACION_CALIFICACION_MAX = 10;
export const EVALUACION_CALIFICACION_STEP = 0.01;
export const EVALUACION_CALIFICACION_MAX_LENGTH = 5;
export const NOTA_APROBADA_MIN = 6;

export type EstadoEvaluacion = 'APROBADO' | 'DESAPROBADO' | 'PENDIENTE';

export function getEstadoEvaluacion(calificacion: number | null | undefined): EstadoEvaluacion {
  if (calificacion === null || calificacion === undefined) return 'PENDIENTE';
  return calificacion >= NOTA_APROBADA_MIN ? 'APROBADO' : 'DESAPROBADO';
}

export const ESTADOS_EVALUACION: readonly { valor: EstadoEvaluacion; etiqueta: string }[] = [
  { valor: 'APROBADO', etiqueta: 'Aprobado' },
  { valor: 'DESAPROBADO', etiqueta: 'Desaprobado' },
  { valor: 'PENDIENTE', etiqueta: 'Pendiente' },
];

export interface EvaluacionResponse {
  id: number;
  nombre: string;
  fecha: string;
  calificacion: number | null;
  materiaId: number;
}

export interface EvaluacionRequest {
  nombre: string;
  fecha: string;
  calificacion?: number | null;
}
