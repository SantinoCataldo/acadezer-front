---
name: typescript-pocock
description: Total TypeScript standards by Matt Pocock. Enforces strict typing, discriminated unions, clean type inference, zero any, and robust type-guard narrowing.
---

# Matt Pocock Total TypeScript Standard

## 1. Core Rule: Zero `any` & Intentional Typing
- Never use `any`. If a type is genuinely dynamic or unknown (e.g. decoded JWT payloads or external webhooks), use `unknown` and narrow it via type guards or Zod/schema validation.
- Avoid redundant type annotations when TypeScript can infer accurately:
  - Good: `const timeoutMs = 4000;`
  - Bad: `const timeoutMs: number = 4000;`

## 2. Discriminated Unions for Complex State
Instead of boolean explosion (e.g., `isLoading`, `isError`, `isSuccess`), model state as a discriminated union:
```typescript
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: ErrorResponse };
```
This guarantees exhaustive pattern matching and eliminates impossible states in components.

## 3. Ban Unsafe Type Assertions (`as`)
- Avoid casting with `as Type` to bypass the compiler. Casts hide runtime runtime bugs.
- If you must assert, use a user-defined type guard function (`value is Type`):
  ```typescript
  function isUserRole(value: string): value is UserRole {
    return value === 'ROLE_USER' || value === 'ROLE_ADMIN';
  }
  ```

## 4. Specific Enums and Literal String Unions
Prefer string literal unions over TypeScript runtime `enum`:
```typescript
export type TipoOperacion = 'VENTA' | 'ALQUILER';
export type EstadoPropiedad = 'DISPONIBLE' | 'RESERVADA' | 'VENDIDA';
```
Literal unions are tree-shakeable, emit zero JavaScript overhead, and serialize cleanly to JSON.
