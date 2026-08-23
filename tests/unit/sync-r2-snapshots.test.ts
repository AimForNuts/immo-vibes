import { describe, expect, it } from "vitest";
import { buildSyncSnapshotKey } from "@/lib/services/sync-r2-snapshots.service";

describe("sync R2 snapshots", () => {
  it("builds date-partitioned keys for paged item syncs", () => {
    const key = buildSyncSnapshotKey({
      job: "items",
      source: "admin",
      itemType: "SWORD",
      page: 2,
      createdAt: new Date("2026-08-23T10:15:30.456Z"),
    });

    expect(key).toBe("sync/items/admin/2026-08-23/sword/page-2/2026-08-23T10-15-30-456Z.json");
  });

  it("builds item-specific keys for per-item sync responses", () => {
    const key = buildSyncSnapshotKey({
      job: "prices",
      source: "cron",
      hashedId: "ABC/123",
      createdAt: new Date("2026-08-23T10:15:30.456Z"),
    });

    expect(key).toBe("sync/prices/cron/2026-08-23/abc-123/2026-08-23T10-15-30-456Z.json");
  });
});
