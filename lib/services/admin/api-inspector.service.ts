import { randomUUID } from "crypto";
import { desc, eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { db } from "@/lib/db";
import {
  apiEndpointSpecs,
  apiResponseSchemas,
  apiSchemaObservations,
} from "@/lib/db/schema";
import { getUserIdlemmoToken as getAuthUserIdlemmoToken } from "@/lib/services/auth-users.service";
import type {
  ApiInspectorParam,
  ApiInspectorSchema,
  ApiInspectorSpecConfig,
} from "@/lib/db/schema";

const BASE_URL = "https://api.idle-mmo.com";

type Primitive = string | number | boolean;
type EndpointSpecRow = typeof apiEndpointSpecs.$inferSelect;
type ResponseSchemaRow = typeof apiResponseSchemas.$inferSelect;
type SchemaObservationRow = typeof apiSchemaObservations.$inferSelect;

type D1Value = string | number | boolean | null;

type D1PreparedStatement = {
  bind(...values: D1Value[]): D1PreparedStatement;
  all<T = unknown>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
};

type D1DatabaseBinding = {
  prepare(query: string): D1PreparedStatement;
};

type ApiInspectorCloudflareEnv = {
  IMMO_SYNC_DB?: D1DatabaseBinding;
};

type ApiEndpointSpecD1Row = {
  key: string;
  label: string;
  method: string;
  path_template: string;
  config: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type ApiResponseSchemaD1Row = {
  endpoint_key: string;
  inferred_schema: string | null;
  manual_schema: string | null;
  active_schema: string | null;
  deprecated_fields: string;
  version: number;
  last_seen_at: string | null;
  updated_by_user_id: string | null;
  updated_at: string;
};

type ApiSchemaObservationD1Row = {
  id: string;
  endpoint_key: string;
  params: string;
  status_code: number;
  duration_ms: number;
  inferred_schema: string;
  new_fields: string;
  missing_fields: string;
  type_conflicts: string;
  created_by_user_id: string | null;
  created_at: string;
};

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
    pathTemplate: "/v1/world/locations/list",
    params: [],
    notes: "Used to document location fields such as id and name.",
  },
  {
    key: "combat.worldBosses",
    label: "Combat World Bosses",
    method: "GET",
    pathTemplate: "/v1/combat/world_bosses/list",
    params: [],
  },
  {
    key: "combat.dungeons",
    label: "Combat Dungeons",
    method: "GET",
    pathTemplate: "/v1/combat/dungeons/list",
    params: [],
  },
  {
    key: "combat.enemies",
    label: "Combat Enemies",
    method: "GET",
    pathTemplate: "/v1/combat/enemies/list",
    params: [],
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
    key: "character.metrics",
    label: "Character Metrics",
    method: "GET",
    pathTemplate: "/v1/character/{hashedId}/metrics",
    params: [hashedCharacterParam()],
  },
  {
    key: "character.effects",
    label: "Character Effects",
    method: "GET",
    pathTemplate: "/v1/character/{hashedId}/effects",
    params: [hashedCharacterParam()],
  },
  {
    key: "character.characters",
    label: "Character Characters",
    method: "GET",
    pathTemplate: "/v1/character/{hashedId}/characters",
    params: [hashedCharacterParam()],
  },
  {
    key: "character.museum",
    label: "Character Museum",
    method: "GET",
    pathTemplate: "/v1/character/{hashedId}/museum",
    params: [hashedCharacterParam()],
  },
  {
    key: "character.currentAction",
    label: "Character Current Action",
    method: "GET",
    pathTemplate: "/v1/character/{hashedId}/current-action",
    params: [hashedCharacterParam()],
  },
  {
    key: "character.pets",
    label: "Character Pets",
    method: "GET",
    pathTemplate: "/v1/character/{hashedId}/pets",
    params: [hashedCharacterParam()],
  },
  {
    key: "pets.companionExchangeListings",
    label: "Companion Exchange Listings",
    method: "GET",
    pathTemplate: "/v1/pets/companion-exchange/listings",
    params: [],
  },
  {
    key: "item.inspect",
    label: "Item Inspect",
    method: "GET",
    pathTemplate: "/v1/item/{hashedId}/inspect",
    params: [hashedItemParam()],
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
      hashedItemParam(),
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
    key: "guild.information",
    label: "Guild Information",
    method: "GET",
    pathTemplate: "/v1/guild/{id}/information",
    params: [guildIdParam()],
  },
  {
    key: "guild.members",
    label: "Guild Members",
    method: "GET",
    pathTemplate: "/v1/guild/{id}/members",
    params: [guildIdParam()],
  },
  {
    key: "guild.activity",
    label: "Guild Activity",
    method: "GET",
    pathTemplate: "/v1/guild/{id}/activity",
    params: [guildIdParam()],
  },
  {
    key: "guild.energizingPool",
    label: "Guild Energizing Pool",
    method: "GET",
    pathTemplate: "/v1/guild/{id}/energizing-pool/information",
    params: [guildIdParam()],
  },
  {
    key: "guild.hall",
    label: "Guild Hall",
    method: "GET",
    pathTemplate: "/v1/guild/{id}/hall",
    params: [guildIdParam()],
  },
  {
    key: "guild.conquest",
    label: "Guild Conquest View",
    method: "GET",
    pathTemplate: "/v1/guild/conquest/view",
    params: [],
  },
  {
    key: "guild.conquestZone",
    label: "Guild Conquest Zone Inspect",
    method: "GET",
    pathTemplate: "/v1/guild/conquest/zone/{zoneId}/inspect",
    params: [
      {
        name: "zoneId",
        source: "path",
        type: "number",
        required: true,
        testValues: [1],
        defaultTestValue: 1,
        notes: "Conquest zone ID. Add known zone IDs as they are discovered.",
      },
    ],
  },
  {
    key: "shrine.progress",
    label: "Shrine Progress",
    method: "GET",
    pathTemplate: "/v1/shrine/progress",
    params: [],
  },
];

function getApiInspectorD1(): D1DatabaseBinding | null {
  try {
    return (getCloudflareContext().env as ApiInspectorCloudflareEnv).IMMO_SYNC_DB ?? null;
  } catch {
    return null;
  }
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (value === null) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function mapD1Spec(row: ApiEndpointSpecD1Row): EndpointSpecRow {
  return {
    key: row.key,
    label: row.label,
    method: row.method,
    pathTemplate: row.path_template,
    config: parseJson<ApiInspectorSpecConfig>(row.config, {
      key: row.key,
      label: row.label,
      method: "GET",
      pathTemplate: row.path_template,
      params: [],
      ...(row.notes ? { notes: row.notes } : {}),
    }),
    notes: row.notes,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapD1Schema(row: ApiResponseSchemaD1Row): ResponseSchemaRow {
  return {
    endpointKey: row.endpoint_key,
    inferredSchema: parseJson<ApiInspectorSchema | null>(row.inferred_schema, null),
    manualSchema: parseJson<ApiInspectorSchema | null>(row.manual_schema, null),
    activeSchema: parseJson<ApiInspectorSchema | null>(row.active_schema, null),
    deprecatedFields: parseJson<string[]>(row.deprecated_fields, []),
    version: row.version,
    lastSeenAt: row.last_seen_at ? new Date(row.last_seen_at) : null,
    updatedByUserId: row.updated_by_user_id,
    updatedAt: new Date(row.updated_at),
  };
}

function mapD1Observation(row: ApiSchemaObservationD1Row): SchemaObservationRow {
  return {
    id: row.id,
    endpointKey: row.endpoint_key,
    params: parseJson<Record<string, string | number | boolean>>(row.params, {}),
    statusCode: row.status_code,
    durationMs: row.duration_ms,
    inferredSchema: parseJson<ApiInspectorSchema>(row.inferred_schema, {}),
    newFields: parseJson<string[]>(row.new_fields, []),
    missingFields: parseJson<string[]>(row.missing_fields, []),
    typeConflicts: parseJson<Array<{ path: string; previous: string; next: string }>>(row.type_conflicts, []),
    createdByUserId: row.created_by_user_id,
    createdAt: new Date(row.created_at),
  };
}

function hashedCharacterParam(): ApiInspectorParam {
  return {
    name: "hashedId",
    source: "path",
    type: "string",
    required: true,
    testValues: [],
    notes: "Character hashed ID. Add a known value once discovered.",
  };
}

function hashedItemParam(): ApiInspectorParam {
  return {
    name: "hashedId",
    source: "path",
    type: "string",
    required: true,
    testValues: [],
    notes: "Item hashed ID. Add a known value once discovered.",
  };
}

function guildIdParam(): ApiInspectorParam {
  return {
    name: "id",
    source: "path",
    type: "number",
    required: true,
    testValues: [1],
    defaultTestValue: 1,
    notes: "Guild ID. Replace with or add known guild IDs after successful runs.",
  };
}

export async function ensureDefaultApiEndpointSpecs() {
  const now = new Date();
  const d1 = getApiInspectorD1();

  for (const spec of DEFAULT_ENDPOINTS) {
    if (d1) {
      await d1
        .prepare(
          `INSERT OR IGNORE INTO api_endpoint_specs
             (key, label, method, path_template, config, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          spec.key,
          spec.label,
          spec.method,
          spec.pathTemplate,
          JSON.stringify(spec),
          spec.notes ?? null,
          now.toISOString(),
          now.toISOString()
        )
        .run();
      continue;
    }

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
  try {
    await ensureDefaultApiEndpointSpecs();
    const d1 = getApiInspectorD1();

    if (d1) {
      const specs = await d1
        .prepare(
          `SELECT key, label, method, path_template, config, notes, created_at, updated_at
           FROM api_endpoint_specs
           ORDER BY label ASC`
        )
        .all<ApiEndpointSpecD1Row>();
      const schemas = await d1
        .prepare(
          `SELECT endpoint_key, inferred_schema, manual_schema, active_schema,
                  deprecated_fields, version, last_seen_at, updated_by_user_id, updated_at
           FROM api_response_schemas`
        )
        .all<ApiResponseSchemaD1Row>();
      const observations = await d1
        .prepare(
          `SELECT id, endpoint_key, params, status_code, duration_ms, inferred_schema,
                  new_fields, missing_fields, type_conflicts, created_by_user_id, created_at
           FROM api_schema_observations
           ORDER BY created_at DESC
           LIMIT 30`
        )
        .all<ApiSchemaObservationD1Row>();

      return {
        specs: specs.results.length > 0 ? specs.results.map(mapD1Spec) : getDefaultEndpointSpecRows(),
        schemas: schemas.results.map(mapD1Schema),
        observations: observations.results.map(mapD1Observation),
        persistenceAvailable: true,
      };
    }

    const specs = await db.select().from(apiEndpointSpecs).orderBy(apiEndpointSpecs.label);
    const schemas = await db.select().from(apiResponseSchemas);
    const observations = await db
      .select()
      .from(apiSchemaObservations)
      .orderBy(desc(apiSchemaObservations.createdAt))
      .limit(30);

    return {
      specs: specs.length > 0 ? specs : getDefaultEndpointSpecRows(),
      schemas,
      observations,
      persistenceAvailable: true,
    };
  } catch (error) {
    console.error("[api-inspector] failed to load persisted endpoint specs", error);
    return {
      specs: getDefaultEndpointSpecRows(),
      schemas: [],
      observations: [],
      persistenceAvailable: false,
    };
  }
}

export async function getEndpointSpec(key: string) {
  try {
    await ensureDefaultApiEndpointSpecs();
    const d1 = getApiInspectorD1();

    if (d1) {
      const { results } = await d1
        .prepare(
          `SELECT key, label, method, path_template, config, notes, created_at, updated_at
           FROM api_endpoint_specs
           WHERE key = ?
           LIMIT 1`
        )
        .bind(key)
        .all<ApiEndpointSpecD1Row>();
      return results[0] ? mapD1Spec(results[0]) : getDefaultEndpointSpecRows().find((row) => row.key === key) ?? null;
    }

    const [spec] = await db.select().from(apiEndpointSpecs).where(eq(apiEndpointSpecs.key, key)).limit(1);
    return spec ?? getDefaultEndpointSpecRows().find((row) => row.key === key) ?? null;
  } catch (error) {
    console.error("[api-inspector] failed to load persisted endpoint spec", error);
    return getDefaultEndpointSpecRows().find((row) => row.key === key) ?? null;
  }
}

export async function updateEndpointSpecConfig(
  key: string,
  config: ApiInspectorSpecConfig
) {
  const now = new Date();
  const d1 = getApiInspectorD1();

  if (d1) {
    await d1
      .prepare(
        `UPDATE api_endpoint_specs
         SET label = ?,
             method = ?,
             path_template = ?,
             config = ?,
             notes = ?,
             updated_at = ?
         WHERE key = ?`
      )
      .bind(
        config.label,
        config.method,
        config.pathTemplate,
        JSON.stringify(config),
        config.notes ?? null,
        now.toISOString(),
        key
      )
      .run();
    const updated = await getEndpointSpec(key);
    if (!updated) throw new Error("Endpoint not found");
    return updated;
  }

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
  return getAuthUserIdlemmoToken(userId);
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

  const current = await getResponseSchema(input.endpointKey).catch((error) => {
    console.error("[api-inspector] failed to load active schema", error);
    return null;
  });
  const diff = compareSchemas(current?.activeSchema ?? null, inferredSchema);

  const observationInput: SchemaObservationRow = {
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
  };

  let observation: SchemaObservationRow = observationInput;
  let persistenceAvailable = true;
  try {
    const d1 = getApiInspectorD1();
    if (d1) {
      await d1
        .prepare(
          `INSERT INTO api_schema_observations
             (id, endpoint_key, params, status_code, duration_ms, inferred_schema,
              new_fields, missing_fields, type_conflicts, created_by_user_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          observationInput.id,
          observationInput.endpointKey,
          JSON.stringify(observationInput.params),
          observationInput.statusCode,
          observationInput.durationMs,
          JSON.stringify(observationInput.inferredSchema),
          JSON.stringify(observationInput.newFields),
          JSON.stringify(observationInput.missingFields),
          JSON.stringify(observationInput.typeConflicts),
          observationInput.createdByUserId,
          observationInput.createdAt.toISOString()
        )
        .run();
    } else {
      [observation] = await db
        .insert(apiSchemaObservations)
        .values(observationInput)
        .returning();
    }
  } catch (error) {
    persistenceAvailable = false;
    console.error("[api-inspector] failed to persist schema observation", error);
  }

  const mergedConfig = mergeTestValues(spec, params);
  try {
    await updateEndpointSpecConfig(input.endpointKey, mergedConfig);
  } catch (error) {
    persistenceAvailable = false;
    console.error("[api-inspector] failed to persist endpoint test values", error);
  }

  return {
    spec: { ...specRow, config: mergedConfig },
    observation,
    persistenceAvailable,
    response: raw,
    inferredSchema,
    currentSchema: current,
    diff,
    path,
  };
}

export async function getResponseSchema(endpointKey: string) {
  try {
    const d1 = getApiInspectorD1();
    if (d1) {
      const { results } = await d1
        .prepare(
          `SELECT endpoint_key, inferred_schema, manual_schema, active_schema,
                  deprecated_fields, version, last_seen_at, updated_by_user_id, updated_at
           FROM api_response_schemas
           WHERE endpoint_key = ?
           LIMIT 1`
        )
        .bind(endpointKey)
        .all<ApiResponseSchemaD1Row>();
      return results[0] ? mapD1Schema(results[0]) : null;
    }

    const [schema] = await db
      .select()
      .from(apiResponseSchemas)
      .where(eq(apiResponseSchemas.endpointKey, endpointKey))
      .limit(1);
    return schema ?? null;
  } catch (error) {
    console.error("[api-inspector] failed to load response schema", error);
    return null;
  }
}

export async function saveResponseSchema(input: {
  endpointKey: string;
  userId: string;
  activeSchema: ApiInspectorSchema;
  manualSchema?: ApiInspectorSchema | null;
  inferredSchema?: ApiInspectorSchema | null;
  deprecatedFields?: string[];
}) {
  try {
    const now = new Date();
    const existing = await getResponseSchema(input.endpointKey);
    const version = (existing?.version ?? 0) + 1;
    const d1 = getApiInspectorD1();

    if (d1) {
      await d1
        .prepare(
          `INSERT INTO api_response_schemas
             (endpoint_key, inferred_schema, manual_schema, active_schema, deprecated_fields,
              version, last_seen_at, updated_by_user_id, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(endpoint_key) DO UPDATE SET
             inferred_schema = excluded.inferred_schema,
             manual_schema = excluded.manual_schema,
             active_schema = excluded.active_schema,
             deprecated_fields = excluded.deprecated_fields,
             version = excluded.version,
             last_seen_at = excluded.last_seen_at,
             updated_by_user_id = excluded.updated_by_user_id,
             updated_at = excluded.updated_at`
        )
        .bind(
          input.endpointKey,
          JSON.stringify(input.inferredSchema ?? existing?.inferredSchema ?? input.activeSchema),
          input.manualSchema === undefined
            ? (existing?.manualSchema === null || existing?.manualSchema === undefined ? null : JSON.stringify(existing.manualSchema))
            : (input.manualSchema === null ? null : JSON.stringify(input.manualSchema)),
          JSON.stringify(input.activeSchema),
          JSON.stringify(input.deprecatedFields ?? existing?.deprecatedFields ?? []),
          version,
          now.toISOString(),
          input.userId,
          now.toISOString()
        )
        .run();

      const schema = await getResponseSchema(input.endpointKey);
      if (!schema) throw new Error("Failed to load saved schema");
      return { schema, persistenceAvailable: true as const };
    }

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

    return { schema, persistenceAvailable: true as const };
  } catch (error) {
    console.error("[api-inspector] failed to save response schema", error);
    return {
      schema: {
        endpointKey: input.endpointKey,
        activeSchema: input.activeSchema,
        manualSchema: input.manualSchema ?? null,
        inferredSchema: input.inferredSchema ?? input.activeSchema,
        deprecatedFields: input.deprecatedFields ?? [],
        version: 0,
        lastSeenAt: null,
        updatedByUserId: input.userId,
        updatedAt: new Date(),
      },
      persistenceAvailable: false as const,
      message: "API inspector database tables are not available yet, so this schema was not saved.",
    };
  }
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

function getDefaultEndpointSpecRows(): EndpointSpecRow[] {
  const now = new Date();
  return DEFAULT_ENDPOINTS
    .map((spec) => ({
      key: spec.key,
      label: spec.label,
      method: spec.method,
      pathTemplate: spec.pathTemplate,
      config: spec,
      notes: spec.notes ?? null,
      createdAt: now,
      updatedAt: now,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
