import { NextResponse } from "next/server";

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

export function invalidRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function readJsonObject(request: Request): Promise<ValidationResult<Record<string, unknown>>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false, message: "Invalid JSON body" };
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, message: "JSON body must be an object" };
  }

  return { ok: true, data: body as Record<string, unknown> };
}

export function parsePositiveInteger(value: string, label: string): ValidationResult<number> {
  if (!/^\d+$/.test(value)) {
    return { ok: false, message: `${label} must be a positive integer` };
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return { ok: false, message: `${label} must be a positive integer` };
  }

  return { ok: true, data: parsed };
}

export function parseStringField(
  body: Record<string, unknown>,
  key: string,
  options: { required?: boolean; minLength?: number } = {}
): ValidationResult<string | undefined> {
  const value = body[key];
  if (value === undefined) {
    return options.required
      ? { ok: false, message: `${key} is required` }
      : { ok: true, data: undefined };
  }

  if (typeof value !== "string") {
    return { ok: false, message: `${key} must be a string` };
  }

  const trimmed = value.trim();
  if (options.required && !trimmed) {
    return { ok: false, message: `${key} is required` };
  }

  if (options.minLength !== undefined && trimmed.length < options.minLength) {
    return { ok: false, message: `${key} must be at least ${options.minLength} characters` };
  }

  return { ok: true, data: trimmed || undefined };
}

export function parseNonNegativeIntegerField(
  body: Record<string, unknown>,
  key: string,
  options: { required?: boolean; nullable?: boolean } = {}
): ValidationResult<number | null | undefined> {
  const value = body[key];
  if (value === undefined) {
    return options.required
      ? { ok: false, message: `${key} is required` }
      : { ok: true, data: undefined };
  }

  if (value === null && options.nullable) {
    return { ok: true, data: null };
  }

  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    return { ok: false, message: `${key} must be a non-negative integer` };
  }

  return { ok: true, data: value };
}

export function parsePositiveIntegerField(
  body: Record<string, unknown>,
  key: string,
  options: { required?: boolean } = {}
): ValidationResult<number | undefined> {
  const value = body[key];
  if (value === undefined) {
    return options.required
      ? { ok: false, message: `${key} is required` }
      : { ok: true, data: undefined };
  }

  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    return { ok: false, message: `${key} must be a positive integer` };
  }

  return { ok: true, data: value };
}

export function parseNonNegativeNumberField(
  body: Record<string, unknown>,
  key: string,
  options: { nullable?: boolean } = {}
): ValidationResult<number | null | undefined> {
  const value = body[key];
  if (value === undefined) {
    return { ok: true, data: undefined };
  }

  if (value === null && options.nullable) {
    return { ok: true, data: null };
  }

  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return { ok: false, message: `${key} must be a non-negative number` };
  }

  return { ok: true, data: value };
}

export function parseIntegerArrayField(
  body: Record<string, unknown>,
  key: string
): ValidationResult<number[]> {
  const value = body[key];
  if (!Array.isArray(value)) {
    return { ok: false, message: `${key} must be an array of positive integers` };
  }

  const parsed: number[] = [];
  for (const entry of value) {
    if (typeof entry !== "number" || !Number.isSafeInteger(entry) || entry < 1) {
      return { ok: false, message: `${key} must be an array of positive integers` };
    }
    parsed.push(entry);
  }

  return { ok: true, data: parsed };
}

export function parseArrayField<T>(
  body: Record<string, unknown>,
  key: string
): ValidationResult<T[] | undefined> {
  const value = body[key];
  if (value === undefined) {
    return { ok: true, data: undefined };
  }

  if (!Array.isArray(value)) {
    return { ok: false, message: `${key} must be an array` };
  }

  return { ok: true, data: value as T[] };
}
