import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { db } from "@/lib/db";
import { characterPets } from "@/lib/db/schema";

type D1Value = string | number | boolean | null;

type D1PreparedStatement = {
  bind(...values: D1Value[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<unknown>;
};

type D1DatabaseBinding = {
  prepare(query: string): D1PreparedStatement;
};

type CharacterPetsCloudflareEnv = {
  IMMO_SYNC_DB?: D1DatabaseBinding;
};

type CharacterPetD1Row = {
  id: string;
  user_id: string;
  character_hashed_id: string;
  pet_id: number;
  name: string;
  custom_name: string | null;
  image_url: string | null;
  level: number;
  quality: string;
  attack_power: number;
  protection: number;
  agility: number;
  accuracy: number | null;
  max_stamina: number | null;
  movement_speed: string | null;
  critical_chance: number | null;
  critical_damage: number | null;
  evolution_state: number;
  evolution_max: number;
  evolution_bonus_per_stage: number;
  synced_at: string;
};

export type StoredCharacterPet = {
  id: string;
  userId: string;
  characterHashedId: string;
  petId: number;
  name: string;
  customName: string | null;
  imageUrl: string | null;
  level: number;
  quality: string;
  attackPower: number;
  protection: number;
  agility: number;
  accuracy: number | null;
  maxStamina: number | null;
  movementSpeed: string | null;
  criticalChance: number | null;
  criticalDamage: number | null;
  evolutionState: number;
  evolutionMax: number;
  evolutionBonusPerStage: number;
  syncedAt: Date;
};

function getCharacterPetsD1(): D1DatabaseBinding | null {
  try {
    return (getCloudflareContext().env as CharacterPetsCloudflareEnv).IMMO_SYNC_DB ?? null;
  } catch {
    return null;
  }
}

function mapD1Row(row: CharacterPetD1Row): StoredCharacterPet {
  return {
    id: row.id,
    userId: row.user_id,
    characterHashedId: row.character_hashed_id,
    petId: row.pet_id,
    name: row.name,
    customName: row.custom_name,
    imageUrl: row.image_url,
    level: row.level,
    quality: row.quality,
    attackPower: row.attack_power,
    protection: row.protection,
    agility: row.agility,
    accuracy: row.accuracy,
    maxStamina: row.max_stamina,
    movementSpeed: row.movement_speed,
    criticalChance: row.critical_chance,
    criticalDamage: row.critical_damage,
    evolutionState: row.evolution_state,
    evolutionMax: row.evolution_max,
    evolutionBonusPerStage: row.evolution_bonus_per_stage,
    syncedAt: new Date(row.synced_at),
  };
}

export async function getStoredCharacterPet(input: {
  userId: string;
  characterHashedId: string;
}): Promise<StoredCharacterPet | null> {
  const d1 = getCharacterPetsD1();
  if (d1) {
    const row = await d1
      .prepare(
        `SELECT id, user_id, character_hashed_id, pet_id, name, custom_name, image_url, level,
                quality, attack_power, protection, agility, accuracy, max_stamina, movement_speed,
                critical_chance, critical_damage, evolution_state, evolution_max,
                evolution_bonus_per_stage, synced_at
         FROM character_pets
         WHERE user_id = ? AND character_hashed_id = ?`
      )
      .bind(input.userId, input.characterHashedId)
      .first<CharacterPetD1Row>();

    return row ? mapD1Row(row) : null;
  }

  const [pet] = await db
    .select()
    .from(characterPets)
    .where(
      and(
        eq(characterPets.userId, input.userId),
        eq(characterPets.characterHashedId, input.characterHashedId)
      )
    )
    .limit(1);

  return pet ?? null;
}

export async function upsertSyncedCharacterPet(input: {
  userId: string;
  characterHashedId: string;
  petId: number;
  name: string;
  customName?: string | null;
  imageUrl?: string | null;
  level: number;
  quality: string;
  attackPower: number;
  protection: number;
  agility: number;
  evolutionState: number;
  evolutionMax: number;
  evolutionBonusPerStage: number;
}) {
  const syncedAt = new Date();
  const d1 = getCharacterPetsD1();

  if (d1) {
    await d1
      .prepare(
        `INSERT INTO character_pets (
           id, user_id, character_hashed_id, pet_id, name, custom_name, image_url, level,
           quality, attack_power, protection, agility, evolution_state, evolution_max,
           evolution_bonus_per_stage, synced_at
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, character_hashed_id) DO UPDATE SET
           pet_id = excluded.pet_id,
           name = excluded.name,
           custom_name = excluded.custom_name,
           image_url = excluded.image_url,
           level = excluded.level,
           quality = excluded.quality,
           attack_power = excluded.attack_power,
           protection = excluded.protection,
           agility = excluded.agility,
           evolution_state = excluded.evolution_state,
           evolution_max = excluded.evolution_max,
           evolution_bonus_per_stage = excluded.evolution_bonus_per_stage,
           synced_at = excluded.synced_at`
      )
      .bind(
        randomUUID(),
        input.userId,
        input.characterHashedId,
        input.petId,
        input.name,
        input.customName ?? null,
        input.imageUrl ?? null,
        input.level,
        input.quality,
        input.attackPower,
        input.protection,
        input.agility,
        input.evolutionState,
        input.evolutionMax,
        input.evolutionBonusPerStage,
        syncedAt.toISOString()
      )
      .run();
    return;
  }

  await db
    .insert(characterPets)
    .values({
      id: randomUUID(),
      userId: input.userId,
      characterHashedId: input.characterHashedId,
      petId: input.petId,
      name: input.name,
      customName: input.customName ?? null,
      imageUrl: input.imageUrl ?? null,
      level: input.level,
      quality: input.quality,
      attackPower: input.attackPower,
      protection: input.protection,
      agility: input.agility,
      evolutionState: input.evolutionState,
      evolutionMax: input.evolutionMax,
      evolutionBonusPerStage: input.evolutionBonusPerStage,
      syncedAt,
    })
    .onConflictDoUpdate({
      target: [characterPets.userId, characterPets.characterHashedId],
      set: {
        petId: input.petId,
        name: input.name,
        customName: input.customName ?? null,
        imageUrl: input.imageUrl ?? null,
        level: input.level,
        quality: input.quality,
        attackPower: input.attackPower,
        protection: input.protection,
        agility: input.agility,
        evolutionState: input.evolutionState,
        evolutionMax: input.evolutionMax,
        evolutionBonusPerStage: input.evolutionBonusPerStage,
        syncedAt,
      },
    });
}

export async function updateStoredCharacterPetStats(input: {
  userId: string;
  characterHashedId: string;
  attackPower?: number | null;
  protection?: number | null;
  agility?: number | null;
  accuracy?: number | null;
  maxStamina?: number | null;
  movementSpeed?: number | null;
  criticalChance?: number | null;
  criticalDamage?: number | null;
}) {
  const d1 = getCharacterPetsD1();
  if (d1) {
    const current = await getStoredCharacterPet({
      userId: input.userId,
      characterHashedId: input.characterHashedId,
    });
    if (!current) return;

    await d1
      .prepare(
        `UPDATE character_pets
         SET attack_power = ?,
             protection = ?,
             agility = ?,
             accuracy = ?,
             max_stamina = ?,
             movement_speed = ?,
             critical_chance = ?,
             critical_damage = ?
         WHERE user_id = ? AND character_hashed_id = ?`
      )
      .bind(
        input.attackPower ?? current.attackPower,
        input.protection ?? current.protection,
        input.agility ?? current.agility,
        input.accuracy === undefined ? current.accuracy : input.accuracy,
        input.maxStamina === undefined ? current.maxStamina : input.maxStamina,
        input.movementSpeed === undefined
          ? current.movementSpeed
          : input.movementSpeed !== null
            ? String(input.movementSpeed)
            : null,
        input.criticalChance === undefined ? current.criticalChance : input.criticalChance,
        input.criticalDamage === undefined ? current.criticalDamage : input.criticalDamage,
        input.userId,
        input.characterHashedId
      )
      .run();
    return;
  }

  await db
    .update(characterPets)
    .set({
      ...(input.attackPower !== undefined &&
        input.attackPower !== null && { attackPower: input.attackPower }),
      ...(input.protection !== undefined &&
        input.protection !== null && { protection: input.protection }),
      ...(input.agility !== undefined && input.agility !== null && { agility: input.agility }),
      ...(input.accuracy !== undefined && { accuracy: input.accuracy }),
      ...(input.maxStamina !== undefined && { maxStamina: input.maxStamina }),
      ...(input.movementSpeed !== undefined && {
        movementSpeed: input.movementSpeed !== null ? String(input.movementSpeed) : null,
      }),
      ...(input.criticalChance !== undefined && { criticalChance: input.criticalChance }),
      ...(input.criticalDamage !== undefined && { criticalDamage: input.criticalDamage }),
    })
    .where(
      and(
        eq(characterPets.userId, input.userId),
        eq(characterPets.characterHashedId, input.characterHashedId)
      )
    );
}
