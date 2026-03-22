# Investments (Price Tracker)

User-tracked items with price history display.

## Business problem

Lets users bookmark specific items (at a given tier) to monitor their latest market price. Each tracked item shows the most recent sale price fetched by the sync pipeline.

## Files

### `page.tsx`
Server component. Renders the page shell and mounts `InvestmentTracker`.

### `InvestmentTracker.tsx`
Client component. Owns all state and behavior:
- Loads tracked items from `GET /api/investments` on mount
- Lazy-loads the latest price entry from `GET /api/investments/[id]/history` per item
- Debounced item search via `GET /api/market?query=…` with dropdown
- Adds items via `POST /api/investments`; removes via `DELETE /api/investments/[id]`

Key exports:
- `InvestmentTracker()` — the root client component (no props; fetches its own data)

## Related docs
- `docs/project-map.md` — Investments section
- `docs/database.md` — `priceTracker`, `market_price_history` tables
