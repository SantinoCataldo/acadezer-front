export const EVALUACION_NOMBRE_MAX_LENGTH = 200;
export const EVALUACION_CALIFICACION_MIN = 0;
export const EVALUACION_CALIFICACION_MAX = 10;
export const EVALUACION_CALIFICACION_STEP = 0.01;

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
