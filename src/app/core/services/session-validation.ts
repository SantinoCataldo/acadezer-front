import { jwtDecode } from 'jwt-decode';
import type { AuthResponse, UserResponse, UserRole } from '../models';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isUserRole(value: unknown): value is UserRole {
  return value === 'STUDENT' || value === 'ADMIN';
}

export function isUserResponse(value: unknown): value is UserResponse {
  return (
    isRecord(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    typeof value['nombre'] === 'string' &&
    typeof value['email'] === 'string' &&
    isUserRole(value['role']) &&
    typeof value['enabled'] === 'boolean'
  );
}

export function isAuthResponse(value: unknown): value is AuthResponse {
  return (
    isRecord(value) &&
    typeof value['accessToken'] === 'string' &&
    value['tokenType'] === 'Bearer' &&
    typeof value['expiresIn'] === 'number' &&
    Number.isFinite(value['expiresIn']) &&
    value['expiresIn'] > 0 &&
    isUserResponse(value['usuario']) &&
    value['usuario'].enabled
  );
}

export function accessTokenExpiresAt(token: string): number | null {
  try {
    const claims = jwtDecode<unknown>(token);
    if (!isRecord(claims) || typeof claims['exp'] !== 'number' || !Number.isFinite(claims['exp']))
      return null;
    const expiresAt = claims['exp'] * 1000;
    return Number.isSafeInteger(expiresAt) && expiresAt > Date.now() ? expiresAt : null;
  } catch {
    return null;
  }
}
