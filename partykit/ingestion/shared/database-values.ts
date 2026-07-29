/**
 * The Workers PostgreSQL client rejects `undefined` bindings. Upstream APIs
 * often omit nullable properties instead of explicitly returning `null`.
 */
export function nullIfUndefined<T>(value: T | undefined): T | null {
  return value === undefined ? null : value;
}

export function hasRequiredText(...values: unknown[]): boolean {
  return values.every(value => typeof value === "string" && value.length > 0);
}

export function requiredText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Recent item is missing required ${field}.`);
  }
  return value;
}

export function finiteNumberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
