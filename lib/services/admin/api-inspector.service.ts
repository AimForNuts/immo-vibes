import { randomUUID } from "crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  apiEndpointSpecs,
  apiResponseSchemas,
  apiSchemaObservations,
  user,
} from "@/lib/db/schema";
import type {
  ApiInspectorParam,
  ApiInspectorSchema,
  ApiInspectorSpecConfig,
} from "@/lib/db/schema";

const BASE_URL = "https://api.idle-mmo.com";

type Primitive = string | number | boolean;

export type ApiInspectorDiff = {
  newFields: string[];
  missingFields: string[];
  typeConflicts: Array<{ path: string; previous: string; next: string }>;
};

const DEFAULT_ENDPOINTS: ApiInspectorSpecConfig[] = [
  {
    key: "auth.check",
    label: "Auth Check",
    method: "GET",
    pathTemplate: "/v1/auth/check",
    params: [],
  },
  {
    key: "locations.list",
    label: "Locations List",
    method: "GET",
    pathTemplate: "/v1/locations",
    params: [],
    notes: "Used to document location fields such as id and name.",
  },
  {
    key: "guild.hall",
    label: "Guild Hall",
    method: "GET",
    pathTemplate: "/v1/guild/{id}/hall",
    params: [
      {
        name: "id",
        source: "path",
        type: "number",
        required: true,
        testValues: [1],
        defaultTestValue: 1,
        notes: "Guild ID. Add real guild IDs as they are discovered.",
      },
    ],
  },
  {
    key: "character.information",
    label: "Character Information",
    method: "GET",
    pathTemplate: "/v1/character/{hashedId}/information",
    params: [
      {
        name: "hashedId",
        source: "path",
        type: "string",
        required: true,
        testValues: [],
        notes: "Character hashed ID.",
      },
    ],
  },
  {
    key: "character.effects",
    label: "Character Effects",
    method: "GET",
    pathTemplate: "/v1/character/{hashedId}/effects",
    params: [
      {
        name: "hashedId",
        source: "path",
        type: "string",
        required: true,
        testValues: [],
      },
    ],
  },
  {
    key: "item.inspect",
    label: "Item Inspect",
    method: "GET",
    pathTemplate: "/v1/item/{hashedId}/inspect",
    params: [
      {
        name: "hashedId",
        source: "path",
        type: "string",
        required: true,
        testValues: [],
      },
    ],
  },
  {
    key: "item.search",
    label: "Item Search",
    method: "GET",
    pathTemplate: "/v1/item/search",
    params: [
      {
        name: "type",
        source: "query",
        type: "string",
        required: true,
        testValues: ["SWORD", "RECIPE", "FISH"],
        defaultTestValue: "SWORD",
      },
      {
        name: "page",
        source: "query",
        type: "number",
        required: false,
        testValues: [1],
        defaultTestValue: 1,
      },
    ],
  },
  {
    key: "item.marketHistory",
    label: "Item Market History",
    method: "GET",
    pathTemplate: "/v1/item/{hashedId}/market-history",
    params: [
      {
        name: "hashedId",
        source: "path",
        type: "string",
        required: true,
        testValues: [],
      },
      {
        name: "tier",
        source: "query",
        type: "number",
        required: false,
        testValues: [0, 1, 2],
        defaultTestValue: 0,
      },
      {
        name: "type",
        source: "query",
        type: "string",
        required: false,
        testValues: ["listings"],
        defaultTestValue: "listings",
      },
    ],
  },
  {
    key: "combat.enemies",
    label: "Combat Enemies",
    method: "GET",
    pathTemplate: "/v1/combat/enemies/list",
    params: [],
  },
  {
    key: "combat.dungeons",
    label: "Combat Dungeons",
    method: "GET",
    pathTemplate: "/v1/combat/dungeons/list",
    params: [],
  },
];

export async function ensureDefaultApiEndpointSpecs() {
  const now = new Date();

  for (const spec of DEFAULT_ENDPOINTS) {
    await db
      .insert(apiEndpointSpecs)
      .values({
        key: spec.key,
        label: spec.label,
        method: spec.method,
        pathTemplate: spec.pathTemplate,
        config: spec,
        notes: spec.notes,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();
  }
}

export async function getApiInspectorState() {
  await ensureDefaultApiEndpointSpecs();

  const specs = await db.select().from(apiEndpointSpecs).orderBy(apiEndpointSpecs.label);
  const schemas = await db.select().from(apiResponseSchemas);
  const observations = await db
    .select()
    .from(apiSchemaObservations)
    .orderBy(desc(apiSchemaObservations.createdAt))
    .limit(30);

  return { specs, schemas, observations };
}

export async function getEndpointSpec(key: string) {
  await ensureDefaultApiEndpointSpecs();
  const [spec] = await db.select().from(apiEndpointSpecs).where(eq(apiEndpointSpecs.key, key)).limit(1);
  return spec ?? null;
}

export async function updateEndpointSpecConfig(
  key: string,
  config: ApiInspectorSpecConfig
) {
  const now = new Date();
  const [row] = await db
    .update(apiEndpointSpecs)
    .set({
      label: config.label,
      method: config.method,
      pathTemplate: config.pathTemplate,
      config,
      notes: config.notes,
      updatedAt: now,
    })
    .where(eq(apiEndpointSpecs.key, key))
    .returning();
  return row;
}

export async function getUserIdlemmoToken(userId: string) {
  const [row] = await db
    .select({ idlemmoToken: user.idlemmoToken })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return row?.idlemmoToken ?? null;
}

export function coerceParamValue(param: ApiInspectorParam, value: unknown): Primitive {
  if (param.type === "number") {
    const num = Number(value);
    if (!Number.isFinite(num)) throw new Error(`${param.name} must be a number`);
    return num;
  }
  if (param.type === "boolean") {
    if (value === true || value === "true") return true;
    if (value === false || value === "false") return false;
    throw new Error(`${param.name} must be a boolean`);
  }
  const str = String(value ?? "").trim();
  if (param.required && str.length === 0) throw new Error(`${param.name} is required`);
  return str;
}

export function buildPath(spec: ApiInspectorSpecConfig, values: Record<string, Primitive>) {
  let path = spec.pathTemplate;
  const query = new URLSearchParams();

  for (const param of spec.params) {
    const value = values[param.name];
    if (value === undefined || value === "") {
      if (param.required) throw new Error(`${param.name} is required`);
      continue;
    }

    if (param.source === "path") {
      path = path.replace(`{${param.name}}`, encodeURIComponent(String(value)));
    } else {
      query.set(param.name, String(value));
    }
  }

  const queryString = query.toString();
  return queryString ? `${path}?${queryString}` : path;
}

export async function runEndpointAndObserve(input: {
  endpointKey: string;
  params: Record<string, unknown>;
  userId: string;
  token: string;
}) {
  const specRow = await getEndpointSpec(input.endpointKey);
  if (!specRow) throw new Error("Endpoint not found");

  const spec = specRow.config;
  const params: Record<string, Primitive> = {};
  for (const param of spec.params) {
    const raw = input.params[param.name] ?? param.defaultTestValue;
    if (raw !== undefined && raw !== "") params[param.name] = coerceParamValue(param, raw);
  }

  const path = buildPath(spec, params);
  const started = Date.now();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${input.token}`, "User-Agent": "ImmoWebSuite/1.0" },
    cache: "no-store",
  });
  const durationMs = Date.now() - started;
  const raw = await readResponseBody(res);
  const inferredSchema = inferTypedSchema(raw);

  const current = await getResponseSchema(input.endpointKey);
  const diff = compareSchemas(current?.activeSchema ?? null, inferredSchema);

  const [observation] = await db
    .insert(apiSchemaObservations)
    .values({
      id: randomUUID(),
      endpointKey: input.endpointKey,
      params,
      statusCode: res.status,
      durationMs,
      inferredSchema,
      newFields: diff.newFields,
      missingFields: diff.missingFields,
      typeConflicts: diff.typeConflicts,
      createdByUserId: input.userId,
      createdAt: new Date(),
    })
    .returning();

  const mergedConfig = mergeTestValues(spec, params);
  await updateEndpointSpecConfig(input.endpointKey, mergedConfig);

  return {
    spec: { ...specRow, config: mergedConfig },
    observation,
    response: raw,
    inferredSchema,
    currentSchema: current,
    diff,
    path,
  };
}

export async function getResponseSchema(endpointKey: string) {
  const [schema] = await db
    .select()
    .from(apiResponseSchemas)
    .where(eq(apiResponseSchemas.endpointKey, endpointKey))
    .limit(1);
  return schema ?? null;
}

export async function saveResponseSchema(input: {
  endpointKey: string;
  userId: string;
  activeSchema: ApiInspectorSchema;
  manualSchema?: ApiInspectorSchema | null;
  inferredSchema?: ApiInspectorSchema | null;
  deprecatedFields?: string[];
}) {
  const now = new Date();
  const existing = await getResponseSchema(input.endpointKey);
  const version = (existing?.version ?? 0) + 1;

  const [schema] = await db
    .insert(apiResponseSchemas)
    .values({
      endpointKey: input.endpointKey,
      activeSchema: input.activeSchema,
      manualSchema: input.manualSchema ?? null,
      inferredSchema: input.inferredSchema ?? input.activeSchema,
      deprecatedFields: input.deprecatedFields ?? existing?.deprecatedFields ?? [],
      version,
      lastSeenAt: now,
      updatedByUserId: input.userId,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: apiResponseSchemas.endpointKey,
      set: {
        activeSchema: input.activeSchema,
        manualSchema: input.manualSchema ?? existing?.manualSchema ?? null,
        inferredSchema: input.inferredSchema ?? existing?.inferredSchema ?? input.activeSchema,
        deprecatedFields: input.deprecatedFields ?? existing?.deprecatedFields ?? [],
        version,
        lastSeenAt: now,
        updatedByUserId: input.userId,
        updatedAt: now,
      },
    })
    .returning();

  return schema;
}

export function mergeSchemas(base: ApiInspectorSchema | null | undefined, next: ApiInspectorSchema): ApiInspectorSchema {
  if (base === null || base === undefined) return next;
  if (Array.isArray(base) && Array.isArray(next)) {
    if (base.length === 0) return next;
    if (next.length === 0) return base;
    return [mergeSchemas(base[0] as ApiInspectorSchema, next[0] as ApiInspectorSchema)];
  }
  if (isPlainObject(base) && isPlainObject(next)) {
    const merged: Record<string, unknown> = { ...base };
    for (const [key, value] of Object.entries(next)) {
      merged[key] = key in merged
        ? mergeSchemas(merged[key] as ApiInspectorSchema, value as ApiInspectorSchema)
        : value;
    }
    return merged;
  }
  if (base === next) return base;
  return unionTypes(typeLabel(base), typeLabel(next));
}

export function inferTypedSchema(value: unknown): ApiInspectorSchema {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    if (value.length === 0) return ["unknown"];
    return [value.map(inferTypedSchema).reduce((acc, item) => mergeSchemas(acc, item))];
  }
  if (typeof value === "object") {
    const obj: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      obj[key] = inferTypedSchema(child);
    }
    return obj;
  }
  return typeof value;
}

export function compareSchemas(current: ApiInspectorSchema | null, next: ApiInspectorSchema): ApiInspectorDiff {
  const currentPaths = flattenSchema(current);
  const nextPaths = flattenSchema(next);
  const currentMap = new Map(currentPaths.map((entry) => [entry.path, entry.type]));
  const nextMap = new Map(nextPaths.map((entry) => [entry.path, entry.type]));

  const newFields = nextPaths
    .filter((entry) => !currentMap.has(entry.path))
    .map((entry) => entry.path);
  const missingFields = currentPaths
    .filter((entry) => !nextMap.has(entry.path))
    .map((entry) => entry.path);
  const typeConflicts = nextPaths
    .filter((entry) => currentMap.has(entry.path) && currentMap.get(entry.path) !== entry.type)
    .map((entry) => ({ path: entry.path, previous: currentMap.get(entry.path) ?? "unknown", next: entry.type }));

  return { newFields, missingFields, typeConflicts };
}

function flattenSchema(schema: ApiInspectorSchema | null, prefix = "$"): Array<{ path: string; type: string }> {
  if (schema === null) return [];
  if (Array.isArray(schema)) {
    if (schema.length === 0) return [{ path: prefix, type: "array<unknown>" }];
    return flattenSchema(schema[0] as ApiInspectorSchema, `${prefix}[]`);
  }
  if (isPlainObject(schema)) {
    const entries = Object.entries(schema as Record<string, unknown>);
    if (entries.length === 0) return [{ path: prefix, type: "object" }];
    return entries.flatMap(([key, value]) => flattenSchema(value as ApiInspectorSchema, `${prefix}.${key}`));
  }
  return [{ path: prefix, type: String(schema) }];
}

function mergeTestValues(spec: ApiInspectorSpecConfig, params: Record<string, Primitive>): ApiInspectorSpecConfig {
  return {
    ...spec,
    params: spec.params.map((param) => {
      const value = params[param.name];
      if (value === undefined || param.testValues.includes(value)) return param;
      return {
        ...param,
        testValues: [...param.testValues, value],
        defaultTestValue: param.defaultTestValue ?? value,
      };
    }),
  };
}

async function readResponseBody(res: Response) {
  const text = await res.text();
  if (text.length === 0) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function typeLabel(value: unknown) {
  if (typeof value === "string") return value;
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (isPlainObject(value)) return "object";
  return typeof value;
}

function unionTypes(a: string, b: string) {
  const parts = new Set([...a.split(" | "), ...b.split(" | ")]);
  return Array.from(parts).sort().join(" | ");
}
