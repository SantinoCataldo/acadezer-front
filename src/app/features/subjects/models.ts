export type DiaSemana = 'LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES' | 'VIERNES' | 'SABADO' | 'DOMINGO';

export type EstadoControlAsistencia = 'PRESENTE' | 'AUSENTE' | 'JUSTIFICADA' | 'PENDIENTE';

export type NumeroControlAsistencia = 1 | 2;

export interface HorarioRequest {
  id?: number;
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
  controlesAsistencia: NumeroControlAsistencia;
}

export interface HorarioResponse extends HorarioRequest {
  id: number;
}

export interface SubjectResponse {
  id: number;
  nombre: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  horarios: HorarioResponse[];
}

export interface SubjectRequest {
  nombre: string;
  fechaInicio: string;
  fechaFin: string | null;
  horarios: HorarioRequest[];
}

export interface AttendanceControlResponse {
  id: number | null;
  horarioId: number;
  fecha: string;
  numero: NumeroControlAsistencia;
  horaInicio: string;
  horaFin: string;
  estado: EstadoControlAsistencia;
}

export interface AttendanceSummaryResponse {
  presentes: number;
  ausentes: number;
  justificadas: number;
  pendientes: number;
  controlesMarcados: number;
  porcentajeAsistencia: number | null;
  controles: AttendanceControlResponse[];
}

export interface AttendanceControlRequest {
  estado: Exclude<EstadoControlAsistencia, 'PENDIENTE'>;
}

export const TITULO_APUNTE_MAX = 200;

export const CONTENIDO_APUNTE_MAX = 20000;

export interface NoteRequest {
  titulo: string;
  contenido: string;
}

export interface NoteResponse {
  id: number;
  titulo: string;
  contenido: string;
  materiaId: number;
  creadoEn: string;
  actualizadoEn: string;
}

export interface PracticeQuestion {
  pregunta: string;
  respuesta: string;
}

export interface PracticeQuestionsResponse {
  preguntas: PracticeQuestion[];
}
