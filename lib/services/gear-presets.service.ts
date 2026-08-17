import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { db } from "@/lib/db";
import { gearPresets } from "@/lib/db/schema";

export type GearPresetSlotMap = Record<string, { hashedId: string; tier: number }>;

export type GearPresetRow = {
  id: string;
  userId: string;
  name: string;
  characterId: string | null;
  weaponStyle: string;
  slots: GearPresetSlotMap;
  createdAt: Date;
  updatedAt: Date;
};

type D1Value = string | number | boolean | null;

type D1PreparedStatement = {
  bind(...values: D1Value[]): D1PreparedStatement;
  all<T = unknown>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
};

type D1DatabaseBinding = {
  prepare(query: string): D1PreparedStatement;
};

type GearPresetsCloudflareEnv = {
  IMMO_SYNC_DB?: D1DatabaseBinding;
};

type GearPresetD1Row = {
  id: string;
  user_id: string;
  name: string;
  character_id: string | null;
  weapon_style: string;
  slots: string;
  created_at: string;
  updated_at: string;
};

function getGearPresetsD1(): D1DatabaseBinding | null {
  try {
    return (getCloudflareContext().env as GearPresetsCloudflareEnv).IMMO_SYNC_DB ?? null;
  } catch {
    return null;
  }
}

function parseSlots(slots: string): GearPresetSlotMap {
  try {
    const parsed = JSON.parse(slots);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as GearPresetSlotMap)
      : {};
  } catch {
    return {};
  }
}

function mapD1Row(row: GearPresetD1Row): GearPresetRow {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    characterId: row.character_id,
    weaponStyle: row.weapon_style,
    slots: parseSlots(row.slots),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export async function getGearPresets(userId: string): Promise<GearPresetRow[]> {
  const d1 = getGearPresetsD1();
  if (d1) {
    const rows = await d1
      .prepare(
        `SELECT id, user_id, name, character_id, weapon_style, slots, created_at, updated_at
         FROM gear_presets
         WHERE user_id = ?
         ORDER BY created_at ASC`
      )
      .bind(userId)
      .all<GearPresetD1Row>();

    return rows.results.map(mapD1Row);
  }

  return db
    .select()
    .from(gearPresets)
    .where(eq(gearPresets.userId, userId))
    .orderBy(gearPresets.createdAt);
}

export async function createGearPreset(input: {
  userId: string;
  name: string;
  weaponStyle: string;
  slots: GearPresetSlotMap;
  characterId?: string | null;
}): Promise<GearPresetRow> {
  const now = new Date();
  const preset: GearPresetRow = {
    id: randomUUID(),
    userId: input.userId,
    name: input.name,
    characterId: input.characterId ?? null,
    weaponStyle: input.weaponStyle,
    slots: input.slots,
    createdAt: now,
    updatedAt: now,
  };

  const d1 = getGearPresetsD1();
  if (d1) {
    await d1
      .prepare(
        `INSERT INTO gear_presets (
           id, user_id, name, character_id, weapon_style, slots, created_at, updated_at
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        preset.id,
        preset.userId,
        preset.name,
        preset.characterId,
        preset.weaponStyle,
        JSON.stringify(preset.slots),
        preset.createdAt.toISOString(),
        preset.updatedAt.toISOString()
      )
      .run();

    return preset;
  }

  const [created] = await db.insert(gearPresets).values(preset).returning();
  return created;
}

export async function updateGearPreset(input: {
  id: string;
  userId: string;
  weaponStyle: string;
  slots: GearPresetSlotMap;
  characterId?: string | null;
}) {
  const updatedAt = new Date();
  const d1 = getGearPresetsD1();

  if (d1) {
    await d1
      .prepare(
        `UPDATE gear_presets
         SET weapon_style = ?, slots = ?, character_id = ?, updated_at = ?
         WHERE id = ? AND user_id = ?`
      )
      .bind(
        input.weaponStyle,
        JSON.stringify(input.slots),
        input.characterId ?? null,
        updatedAt.toISOString(),
        input.id,
        input.userId
      )
      .run();
    return;
  }

  await db
    .update(gearPresets)
    .set({
      weaponStyle: input.weaponStyle,
      slots: input.slots,
      characterId: input.characterId ?? null,
      updatedAt,
    })
    .where(and(eq(gearPresets.id, input.id), eq(gearPresets.userId, input.userId)));
}

export async function deleteGearPreset(input: {
  id: string;
  userId: string;
}) {
  const d1 = getGearPresetsD1();
  if (d1) {
    await d1
      .prepare(
        `DELETE FROM gear_presets
         WHERE id = ? AND user_id = ?`
      )
      .bind(input.id, input.userId)
      .run();
    return;
  }

  await db
    .delete(gearPresets)
    .where(and(eq(gearPresets.id, input.id), eq(gearPresets.userId, input.userId)));
}
