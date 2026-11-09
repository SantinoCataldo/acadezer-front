import type { UserResponse } from './user.models';

export type UserRole = 'STUDENT' | 'ADMIN';
export interface AuthRequest {
  email: string;
  password: string;
}
export interface RegisterRequest {
  nombre: string;
  email: string;
  password: string;
}
export interface AuthResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  usuario: UserResponse;
}
