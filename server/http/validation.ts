export interface ValidationSuccess<T> {
  ok: true;
  data: T;
}

export interface ValidationFailure {
  ok: false;
  error: string;
}

export type ValidationResult<T> =
  | ValidationSuccess<T>
  | ValidationFailure;

export function valid<T>(data: T): ValidationSuccess<T> {
  return { ok: true, data };
}

export function invalid(error: string): ValidationFailure {
  return { ok: false, error };
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

export function requiredString(
  value: unknown,
  maxLength: number,
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : null;
}

export function optionalString(
  value: unknown,
  maxLength: number,
): string | null | undefined {
  if (value == null) return null;
  return requiredString(value, maxLength) ?? undefined;
}

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

export function optionalFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function readJsonBody(
  request: Request,
): Promise<ValidationResult<unknown>> {
  try {
    return valid(await request.json());
  } catch {
    return invalid("Invalid JSON body");
  }
}
