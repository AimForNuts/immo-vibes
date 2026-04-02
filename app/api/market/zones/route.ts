import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { zones } from "@/lib/db/schema";

type ZoneResult = {
  id:             number;
  name:           string;
  level_required: number;
  enemies?:       Array<{ name: string; level: number }>;
  dungeons?:      Array<{ name: string }>;
  world_bosses?:  Array<{ name: string }>;
};

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId")?.trim() ?? "";

  if (!itemId) {
    return NextResponse.json({ error: "itemId is required" }, { status: 400 });
  }

  const allZones = await db.select().from(zones);

  const results = allZones.reduce<ZoneResult[]>((acc, zone) => {
    let matched = false;
    const result: ZoneResult = {
      id:             zone.id,
      name:           zone.name,
      level_required: zone.levelRequired,
    };

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
