import type { UserRole } from './auth.models';

export interface UserResponse {
  id: number;
  nombre: string;
  email: string;
  role: UserRole;
  enabled: boolean;
}

export interface AdminStatsResponse {
  usuarios: number;
  usuariosHabilitados: number;
  estudiantes: number;
  administradores: number;
  materias: number;
  apuntes: number;
  pendientes: number;
  evaluaciones: number;
  asistencias: number;
}
