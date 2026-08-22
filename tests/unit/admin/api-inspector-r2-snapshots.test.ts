import { describe, expect, it } from "vitest";
import { buildApiInspectorSnapshotKey } from "@/lib/services/admin/api-inspector-r2-snapshots.service";

describe("API Inspector R2 snapshots", () => {
  it("builds stable date-partitioned keys", () => {
    const key = buildApiInspectorSnapshotKey({
      endpointKey: "Item.Market History",
      observationId: "obs_123",
      createdAt: new Date("2026-08-22T20:30:15.123Z"),
    });

    expect(key).toBe("api-inspector/item.market-history/2026-08-22/2026-08-22T20-30-15-123Z-obs_123.json");
  });

  it("falls back for empty endpoint keys", () => {
    const key = buildApiInspectorSnapshotKey({
      endpointKey: " ... ",
      observationId: "obs_456",
      createdAt: new Date("2026-08-22T20:30:15.123Z"),
    });

    expect(key).toBe("api-inspector/unknown-endpoint/2026-08-22/2026-08-22T20-30-15-123Z-obs_456.json");
  });
});
