# Market Browser

Serves the item browse/search page with tab navigation, quality/price filters, and an item detail panel with recipe cost calculator.

## Business problem

Lets users browse the full IdleMMO item catalog (served from DB) by category, search by name, filter by quality/price, and inspect individual items including their recipe cost breakdown.

## Files

### `MarketBrowser.tsx`
Root client component. Orchestrates the two hooks, owns filter state, renders the full page layout.

### `types.ts`
All TypeScript interfaces for this feature: `DbItem`, `FullItem`, `MarketPrice`, `Filters`.

### `components/ItemCard.tsx`
`ItemCard` — renders a single item tile with quality color, prices, hover effect.
`SkeletonCard` — loading placeholder matching ItemCard dimensions.

### `components/FilterBar.tsx`
`FilterBar` — rarity toggles, vendor/market price range inputs, item type multi-select. Calls `setFilters` from parent.

### `components/DetailPanel.tsx`
`DetailPanel` — slide-in panel showing full item stats, effects, requirements, recipe materials with live market prices, and crafted-by info.

### `hooks/useMarketItems.ts`
Manages all item list fetching:
- Tab switch → paginated DB fetch with in-memory cache (no re-fetch on revisit)
- Search on "All" tab → debounced fetch with abort
- Returns `{ items, loading, loadProgress, error, activeTab, searchQuery, setSearchQuery, switchTab, handleSearchInput }`

### `hooks/useItemDetail.ts`
Manages item detail panel data:
- Fetches full item data from `/api/market/item/[id]`
- Fetches material prices from `/api/market/price/[id]` in parallel
- Fetches crafted-by recipe from `/api/market/crafted-by/[id]`
- Returns `{ selectedItem, itemDetail, materialPrices, craftedByDetail, craftedByItemData, resultItemData, handleItemClick, clearSelection }`

## Related docs
- `docs/project-map.md` — Market Browser section
- `docs/game-mechanics/item-types.md` — item type/tab mapping
- `docs/game-mechanics/items.md` — item quality tiers
- `lib/market-config.ts` — tab definitions (MARKET_TABS)
