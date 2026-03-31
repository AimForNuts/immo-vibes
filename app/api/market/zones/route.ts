import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { zones } from "@/lib/db/schema";

/**
 * GET /api/market/zones?itemId=<hashed_id>
 *
 * Returns all zones in which the given item can be found.
 * A zone matches if the item appears in any of:
 *   - skillItems  (gatherable resource)
 *   - enemies[].drops  (enemy loot)
 *   - dungeons[].drops  (dungeon loot)
 *   - worldBosses[].drops  (world-boss loot)
 *
 * A zone can match multiple arrays; all matches are merged into one ZoneResult.
 *
 * Response: { zones: ZoneResult[] }
 */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId")?.trim() ?? "";

  if (!itemId) {
    return NextResponse.json({ error: "itemId is required" }, { status: 400 });
  }

  const allZones = await db.select().from(zones);

  const results = allZones.reduce<
    Array<{
      id:             number;
      name:           string;
      level_required: number;
      skill?:         "woodcutting" | "fishing" | "mining";
      enemies?:       Array<{ name: string; level: number }>;
      dungeons?:      Array<{ name: string }>;
      world_bosses?:  Array<{ name: string }>;
    }>
  >((acc, zone) => {
    let matched = false;
    const result: {
      id:             number;
      name:           string;
      level_required: number;
      skill?:         "woodcutting" | "fishing" | "mining";
      enemies?:       Array<{ name: string; level: number }>;
      dungeons?:      Array<{ name: string }>;
      world_bosses?:  Array<{ name: string }>;
    } = {
      id:             zone.id,
      name:           zone.name,
      level_required: zone.levelRequired,
    };

    // Check skillItems
    const skillMatch = (zone.skillItems ?? []).find(
      (si) => si.item_hashed_id === itemId
    );
    if (skillMatch) {
      matched = true;
      result.skill = skillMatch.skill;
    }

    // Check enemies
    const matchedEnemies = (zone.enemies ?? []).filter((e) =>
      e.drops.includes(itemId)
    );
    if (matchedEnemies.length > 0) {
      matched = true;
      result.enemies = matchedEnemies.map((e) => ({ name: e.name, level: e.level }));
    }

    // Check dungeons
    const matchedDungeons = (zone.dungeons ?? []).filter((d) =>
      d.drops?.includes(itemId)
    );
    if (matchedDungeons.length > 0) {
      matched = true;
      result.dungeons = matchedDungeons.map((d) => ({ name: d.name }));
    }

    // Check world bosses
    const matchedWorldBosses = (zone.worldBosses ?? []).filter((wb) =>
      wb.drops?.includes(itemId)
    );
    if (matchedWorldBosses.length > 0) {
      matched = true;
      result.world_bosses = matchedWorldBosses.map((wb) => ({ name: wb.name }));
    }

    if (matched) acc.push(result);
    return acc;
  }, []);

  return NextResponse.json({ zones: results });
}
