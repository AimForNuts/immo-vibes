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
 */

import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { characters } from "@/lib/db/schema";
import { getCharacterInfo, getAltCharacters } from "@/lib/idlemmo";

export const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

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
  cachedAt:      Date;
}

/**
 * Reads the character roster from the DB only — no API calls, always instant.
 * Returns an empty array if no cache exists yet.
 */
export async function getDbCharacters(userId: string): Promise<CachedCharacter[]> {
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
    const [primary, alts] = await Promise.all([
      getCharacterInfo(charId, token),
      getAltCharacters(charId, token),
    ]);

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
        cachedAt:      now,
      })),
    ];

    await db.delete(characters).where(eq(characters.userId, userId));
    await db.insert(characters).values(allChars);

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
