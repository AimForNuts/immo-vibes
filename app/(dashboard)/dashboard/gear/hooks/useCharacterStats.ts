"use client";

import { useState, useEffect } from "react";
import { CHAR_STAT_MAP } from "@/lib/game-constants";

interface UseCharacterStatsReturn {
  charStats:   Record<string, number>;
  charLoading: boolean;
}

/**
 * Fetches character data from the IdleMMO API and transforms raw skill
 * levels into combat stat values using CHAR_STAT_MAP from lib/game-constants.ts.
 *
 * @param characterId - The hashed character ID, or empty string to skip fetch
 * @returns `{ charStats, charLoading }`
 */
export function useCharacterStats(characterId: string): UseCharacterStatsReturn {
  const [charStats, setCharStats]     = useState<Record<string, number>>({});
  const [charLoading, setCharLoading] = useState(false);

  useEffect(() => {
    if (!characterId) { setCharStats({}); return; }
    let cancelled = false;
    setCharLoading(true);
    fetch(`/api/idlemmo/character/${characterId}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const stats: Record<string, number> = {};
        if (data.stats) {
          for (const [k, v] of Object.entries(data.stats as Record<string, { level: number }>)) {
            const mapping = CHAR_STAT_MAP[k];
            if (mapping) stats[mapping.key] = Math.round(v.level * mapping.multiplier);
          }
        }
        setCharStats(stats);
      })
      .catch(() => setCharStats({}))
      .finally(() => { if (!cancelled) setCharLoading(false); });
    return () => { cancelled = true; };
  }, [characterId]);

  return { charStats, charLoading };
}
