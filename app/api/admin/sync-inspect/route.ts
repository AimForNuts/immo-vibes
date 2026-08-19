import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { IDLEMMO_ITEM_TYPES } from "@/lib/idlemmo";
import { recordSyncLog } from "@/lib/services/admin/sync-logs.service";
import { countItemsByType, getItemIdsByType, updateItemInspectFields } from "@/lib/services/items.service";

export const maxDuration = 300;

const BASE      = "https://api.idle-mmo.com";
const ALL_TYPES = IDLEMMO_ITEM_TYPES as readonly string[];
const PAGE_SIZE_DEFAULT = 40;
const PAGE_SIZE_MAX     = 100;

/**
 * POST /api/admin/sync-inspect?type=SWORD&page=1&pageSize=40
 *
 * Fetches inspect data (stats, effects, recipe, requirements) for one page of
 * items of the given type and writes them to the DB inspect fields.
 *
 * Pagination keeps each call within Vercel's 300s maxDuration:
 * at 20 req/min, 40 items ≈ 2 rate-limit windows ≈ 2 min.
 *
 * Rate-limit aware: reads X-RateLimit-Remaining and X-RateLimit-Reset from
 * every response and waits exactly as long as the API instructs.
 * Retries automatically on 429 (up to MAX_RETRIES). Never loops infinitely.
 *
 * Response: { synced, skipped, total, page, totalPages }
 */
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = session.user.idlemmoToken;
  if (!token) return NextResponse.json({ error: "No IdleMMO API token configured" }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type")?.toUpperCase();

  if (!type || !ALL_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `Invalid type. Must be one of: ${IDLEMMO_ITEM_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(
    PAGE_SIZE_MAX,
    Math.max(1, parseInt(searchParams.get("pageSize") ?? String(PAGE_SIZE_DEFAULT), 10))
  );

  await recordSyncLog({
    job: "inspect",
    status: "started",
    message: `Started inspect sync for ${type} page ${page}`,
    details: { type, page, pageSize },
    userId: session.user.id,
  });

  const total = await countItemsByType(type);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (total === 0) {
    await recordSyncLog({
      job: "inspect",
      status: "skipped",
      message: `Skipped inspect sync for ${type}: no local items`,
      details: { type, synced: 0, skipped: 0, total: 0, page: 1, totalPages: 1 },
      userId: session.user.id,
    });
    return NextResponse.json({ synced: 0, skipped: 0, total: 0, page: 1, totalPages: 1 });
  }

  const rows = await getItemIdsByType(type, page, pageSize);

  const reqHeaders = { Authorization: `Bearer ${token}`, "User-Agent": "ImmoWebSuite/1.0" };
  let synced  = 0;
  let skipped = 0;

  const rl = { remaining: null as number | null, resetAt: 0 };
  const MAX_RETRIES = 10;

  async function rateLimitedFetch(url: string): Promise<Response> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (rl.remaining !== null && rl.remaining <= 0) {
        const waitMs = Math.max(1000, rl.resetAt * 1000 - Date.now() + 500);
        await new Promise((r) => setTimeout(r, waitMs));
      }

      const res = await fetch(url, { headers: reqHeaders, cache: "no-store" });
      const rem = res.headers.get("x-ratelimit-remaining");
      const rst = res.headers.get("x-ratelimit-reset");
      if (rem !== null) rl.remaining = parseInt(rem, 10);
      if (rst !== null) rl.resetAt   = parseInt(rst, 10);

      if (res.status !== 429) return res;

      rl.remaining = 0;
      const waitMs = Math.max(1000, rl.resetAt * 1000 - Date.now() + 500);
      await new Promise((r) => setTimeout(r, waitMs));
    }
    throw new Error(`Max retries (${MAX_RETRIES}) exceeded — API returning persistent 429`);
  }

  const now = new Date();

  for (const { hashedId } of rows) {
    try {
      const res = await rateLimitedFetch(`${BASE}/v1/item/${hashedId}/inspect`);

      if (!res.ok) { skipped++; continue; }

      const data = await res.json();
      const item = data.item;
      if (!item) { skipped++; continue; }

      await updateItemInspectFields(hashedId, {
        description: item.description ?? null,
        isTradeable: item.is_tradeable ?? null,
        maxTier: item.max_tier ?? null,
        requirements: item.requirements ?? null,
        baseStats: item.stats ?? null,
        tierModifiers: item.tier_modifiers ?? null,
        effects: item.effects ?? null,
        recipe: item.recipe ?? null,
        inspectedAt: now,
      });

      synced++;
    } catch {
      skipped++;
    }
  }

  await recordSyncLog({
    job: "inspect",
    status: skipped > 0 ? "progress" : "success",
    message: `Inspect sync ${type} page ${page}/${totalPages}: ${synced} synced, ${skipped} skipped`,
    details: { type, page, pageSize, total, totalPages, synced, skipped },
    userId: session.user.id,
  });

  return NextResponse.json({ synced, skipped, total, page, totalPages });
}
