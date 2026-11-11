/**
 * Contratos de transporte de materias.
 * Referencia: docs/ESPECIFICACION_Y_ARQUITECTURA.md, sección 4.
 *
 * `descripcion` llega null cuando el backend no guardó texto. No se reemplaza
 * por cadena vacía: null y ausencia de valor tienen significado distinto.
 * Las materias no manejan fechas, por lo que no aplica formato YYYY-MM-DD acá.
 */

/** Materia tal como la devuelve la API. */
export interface SubjectResponse {
  id: number;
  nombre: string;
  descripcion: string | null;
}

/** Cuerpo de creación y edición (POST /api/materias y PUT /api/materias/{id}). */
export interface SubjectRequest {
  nombre: string;
  descripcion: string | null;
}
