export class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length(): number {
    return this.values.size;
  }
  clear(): void {
    this.values.clear();
  }
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.values.delete(key);
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

export function testToken(expiresAt = Date.now() + 60_000): string {
  return `${btoa('{"alg":"HS256"}')}.${btoa(JSON.stringify({ exp: Math.floor(expiresAt / 1000) }))}.signature`;
}

export const student = {
  id: 1,
  nombre: 'Ana',
  email: 'ana@example.com',
  role: 'STUDENT',
  enabled: true,
};
