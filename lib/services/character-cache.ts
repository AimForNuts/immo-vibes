/**
 * Character cache service.
 *
 * Reads the character roster from the DB and refreshes from the IdleMMO API
 * when the cache is stale (older than CACHE_TTL_MS). This eliminates the
 * two live API calls on every overview page load while keeping data fresh.
 *
 * Business rules:
 * - Characters are ordered by idlemmoId ASC (deterministic, matches game order).
 * - Primary character always has isPrimary = true, locationName, currentStatus.
 * - Alt characters have locationName = null, currentStatus = null.
 * - Max 5 characters total (primary + up to 4 alts).
 */

import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { characters } from "@/lib/db/schema";
import { getCharacterInfo, getAltCharacters } from "@/lib/idlemmo";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

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
}

/**
 * Returns the cached character roster for a user, refreshing from the API if stale.
 * Never throws — returns an empty array if the API is unavailable.
 */
export async function getCachedCharacters(
  userId: string,
  charId: string,
  token:  string
): Promise<CachedCharacter[]> {
  const rows = await db
    .select()
    .from(characters)
    .where(eq(characters.userId, userId))
    .orderBy(asc(characters.idlemmoId));

  const isStale = rows.length === 0
    || (Date.now() - rows[0].cachedAt.getTime()) > CACHE_TTL_MS;

  if (!isStale) return rows;

  // Cache is empty or stale — fetch fresh data
  try {
    const [primary, alts] = await Promise.all([
      getCharacterInfo(charId, token),
      getAltCharacters(charId, token),
    ]);

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
      ...alts.slice(0, 4).map((a) => ({
        userId,
        hashedId:      a.hashed_id,
        idlemmoId:     a.id,
        name:          a.name,
        class:         a.class,
        imageUrl:      a.image_url ?? null,
        totalLevel:    a.total_level,
        locationName:  null,
        currentStatus: null,
        isPrimary:     false,
        cachedAt:      now,
      })),
    ];

    // Delete old rows for this user and insert fresh ones atomically
    await db.delete(characters).where(eq(characters.userId, userId));
    await db.insert(characters).values(allChars);

    return allChars
      .slice()
      .sort((a, b) => a.idlemmoId - b.idlemmoId);
  } catch {
    // API unavailable — return whatever is in the DB (may be stale)
    return rows;
  }
}
