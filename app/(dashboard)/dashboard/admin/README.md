# Admin Panel

Manual sync triggers with live activity log and per-type status.

## Business problem

Gives admins a UI to manually trigger the item catalog, price, recipe, and inspect syncs outside the cron schedule, with real-time progress feedback per item type.

## Files

### `page.tsx`
Client component (the entire page is interactive). Orchestrates the sync workflows:
- Sync Items — calls `POST /api/admin/sync-items?type=<TYPE>` for each item type sequentially
- Sync Prices — calls `POST /api/admin/sync-prices?type=<TYPE>` with pagination loop
- Sync Inspect — calls `POST /api/admin/sync-inspect?type=<TYPE>` with pagination loop
- Shows a live activity log, per-type status, and cancel support
- Requires `session.user.role === "admin"` (enforced in the API routes)

## Related docs
- `docs/project-map.md` — Admin Panel section
- `docs/api/internal/` — admin route request/response shapes
- `docs/database.md` — `sync_state` table
