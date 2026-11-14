export interface Tarea {
  id: number;
  titulo: string;
  descripcion: string | null;
  fechaLimite: string | null;
  completado: boolean;
  materiaId: number;
}

export interface TareaRequest {
  titulo: string;
  descripcion: string | null;
  fechaLimite: string | null;
}
