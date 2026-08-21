import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { searchItemsByType, IDLEMMO_ITEM_TYPES } from "@/lib/idlemmo";
import { upsertSyncStateJob } from "@/lib/services/sync-state.service";
import { upsertCatalogItems } from "@/lib/services/items.service";
import { getFirstAdminIdleMMOToken } from "@/lib/services/auth-users.service";

export const maxDuration = 300;

/**
 * POST /api/cron/sync-items
 *
 * Weekly item catalog sync — refreshes the items table (name, type, quality,
 * image_url, vendor_price) for all item types.
 *
 * Runs Monday 00:00 UTC. Marks sync_state job='items' done on completion
 * so the downstream recipes cron can gate on it.
 *
 * Protected by CRON_SECRET (set automatically by Vercel).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getFirstAdminIdleMMOToken();
  if (!token) {
    return NextResponse.json({ error: "No admin IdleMMO token configured" }, { status: 500 });
  }

  // Mark running
  const startedAt = new Date();
  await upsertSyncStateJob({ job: "items", status: "running", startedAt, completedAt: null });

  const now = new Date();
  let totalSynced = 0;

  for (const type of IDLEMMO_ITEM_TYPES) {
    try {
      const fetched = await searchItemsByType(type, token);
      if (fetched.length === 0) continue;

      await upsertCatalogItems(fetched.map((item) => ({
        hashedId: item.hashed_id,
        name: item.name,
        type: item.type.toUpperCase(),
        quality: item.quality.toUpperCase(),
        imageUrl: item.image_url ?? null,
        vendorPrice: item.vendor_price ?? null,
        syncedAt: now,
      })));

      totalSynced += fetched.length;
    } catch {
      console.error(`[cron/sync-items] Failed to sync type ${type}`);
    }
  }

  // Mark done
  await upsertSyncStateJob({ job: "items", status: "done", startedAt, completedAt: new Date() });

  return NextResponse.json({ synced: totalSynced, types: IDLEMMO_ITEM_TYPES.length });
}
