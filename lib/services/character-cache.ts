/**
 * Character cache service.
 *
 * getDbCharacters  — instant DB read, no API calls. Used on page render.
 * refreshCharacters — fetches from IdleMMO API, updates the DB cache.
 *                     Called in the background after the page has rendered.
 * getCachedCharacters — legacy combined function kept for /api/characters/route.ts.
 *
 * Business rules:
 * - Characters are ordered by idlemmoId ASC (deterministic, matches game order).
 * - All characters (primary + alts) have locationName and currentStatus populated.
 *   Alt details are fetched in parallel via getCharacterInfo per alt.
 * - Max 5 characters total (primary + up to 4 alts).
 * - Cache TTL: 5 minutes. Data older than this is considered stale.
 * - isMember is derived from the primary character's /effects endpoint:
 *   any effect with source === "membership" means the account has active membership.
 *   The flag is written to all characters under the same user.
 */

import { eq, asc } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { db } from "@/lib/db";
import { characters } from "@/lib/db/schema";
import { getCharacterInfo, getAltCharacters, getCharacterEffects } from "@/lib/idlemmo";

export const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

type D1Value = string | number | boolean | null;

type D1PreparedStatement = {
  bind(...values: D1Value[]): D1PreparedStatement;
  all<T = unknown>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
};

type D1DatabaseBinding = {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown[]>;
};

type CharactersCloudflareEnv = {
  IMMO_SYNC_DB?: D1DatabaseBinding;
};

type CharacterD1Row = {
  user_id: string;
  hashed_id: string;
  idlemmo_id: number;
  name: string;
  class: string;
  image_url: string | null;
  total_level: number;
  location_name: string | null;
  current_status: string | null;
  is_primary: number;
  is_member: number | null;
  cached_at: string;
};

export interface CachedCharacter {
  hashedId:      string;
  idlemmoId:     number;
  name:          string;
  class:         string;
  imageUrl:      string | null;
  totalLevel:    number;
  locationName:  string | null;
  currentStatus: string | null;
  isPrimary:     boolean;
  /** Null until the first effects sync. True/false once synced. */
  isMember:      boolean | null;
  cachedAt:      Date;
}

type CharacterCacheWrite = CachedCharacter & {
  userId: string;
};

function getCharactersD1(): D1DatabaseBinding | null {
  try {
    return (getCloudflareContext().env as CharactersCloudflareEnv).IMMO_SYNC_DB ?? null;
  } catch {
    return null;
  }
}

function mapD1Row(row: CharacterD1Row): CachedCharacter {
  return {
    hashedId: row.hashed_id,
    idlemmoId: row.idlemmo_id,
    name: row.name,
    class: row.class,
    imageUrl: row.image_url,
    totalLevel: row.total_level,
    locationName: row.location_name,
    currentStatus: row.current_status,
    isPrimary: Boolean(row.is_primary),
    isMember: row.is_member === null ? null : Boolean(row.is_member),
    cachedAt: new Date(row.cached_at),
  };
}

async function replaceCharacterCache(userId: string, rows: CharacterCacheWrite[]) {
  const d1 = getCharactersD1();

  if (d1) {
    await d1.batch([
      d1.prepare("DELETE FROM characters WHERE user_id = ?").bind(userId),
      ...rows.map((row) =>
        d1
          .prepare(
            `INSERT INTO characters (
               user_id, hashed_id, idlemmo_id, name, class, image_url, total_level,
               location_name, current_status, is_primary, is_member, cached_at
             )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            row.userId,
            row.hashedId,
            row.idlemmoId,
            row.name,
            row.class,
            row.imageUrl,
            row.totalLevel,
            row.locationName,
            row.currentStatus,
            row.isPrimary ? 1 : 0,
            row.isMember === null ? null : row.isMember ? 1 : 0,
            row.cachedAt.toISOString()
          )
      ),
    ]);
    return;
  }

  await db.delete(characters).where(eq(characters.userId, userId));
  await db.insert(characters).values(rows);
}

/**
 * Reads the character roster from the DB only — no API calls, always instant.
 * Returns an empty array if no cache exists yet.
 */
export async function getDbCharacters(userId: string): Promise<CachedCharacter[]> {
  const d1 = getCharactersD1();
  if (d1) {
    const { results } = await d1
      .prepare(
        `SELECT user_id, hashed_id, idlemmo_id, name, class, image_url, total_level,
                location_name, current_status, is_primary, is_member, cached_at
         FROM characters
         WHERE user_id = ?
         ORDER BY idlemmo_id ASC`
      )
      .bind(userId)
      .all<CharacterD1Row>();

    return results.map(mapD1Row);
  }

  return db
    .select()
    .from(characters)
    .where(eq(characters.userId, userId))
    .orderBy(asc(characters.idlemmoId));
}

/**
 * Fetches fresh character data from the IdleMMO API and updates the DB cache.
 * Returns the updated roster. Never throws — returns null if the API is unavailable.
 */
export async function refreshCharacters(
  userId: string,
  charId: string,
  token:  string
): Promise<CachedCharacter[] | null> {
  try {
    const [primary, alts, effects] = await Promise.all([
      getCharacterInfo(charId, token),
      getAltCharacters(charId, token),
      getCharacterEffects(charId, token),
    ]);

    const isMember = effects.some((e) => e.source === "membership");

    const altSlice = alts.slice(0, 4);
    const altDetails = await Promise.all(
      altSlice.map((a) => getCharacterInfo(a.hashed_id, token))
    );

    const now = new Date();
    const allChars = [
      {
        userId,
        hashedId:      primary.hashed_id,
        idlemmoId:     primary.id,
        name:          primary.name,
        class:         primary.class,
        imageUrl:      primary.image_url ?? null,
        totalLevel:    primary.total_level,
        locationName:  primary.location?.name ?? null,
        currentStatus: primary.current_status,
        isPrimary:     true,
        isMember,
        cachedAt:      now,
      },
      ...altSlice.map((a, i) => ({
        userId,
        hashedId:      a.hashed_id,
        idlemmoId:     a.id,
        name:          a.name,
        class:         a.class,
        imageUrl:      a.image_url ?? null,
        totalLevel:    a.total_level,
        locationName:  altDetails[i]?.location?.name ?? null,
        currentStatus: altDetails[i]?.current_status ?? null,
        isPrimary:     false,
        isMember,
        cachedAt:      now,
      })),
    ];

    await replaceCharacterCache(userId, allChars);

    return allChars.slice().sort((a, b) => a.idlemmoId - b.idlemmoId);
  } catch {
    return null;
  }
}

/**
 * Returns the cached character roster, refreshing from the API if stale.
 * Kept for use in /api/characters/route.ts (background-safe — not called during SSR).
 */
export async function getCachedCharacters(
  userId: string,
  charId: string,
  token:  string
): Promise<CachedCharacter[]> {
  const rows = await getDbCharacters(userId);

  const isStale = rows.length === 0
    || (Date.now() - rows[0].cachedAt.getTime()) > CACHE_TTL_MS;

  if (!isStale) return rows;

  return (await refreshCharacters(userId, charId, token)) ?? rows;
}
