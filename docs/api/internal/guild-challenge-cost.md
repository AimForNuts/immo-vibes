# Internal API - Guild Challenge Cost

Authenticated endpoint for pricing pasted guild challenge material lists from local market data.

Sources:
- `app/api/guild/challenge-cost/route.ts`
- `lib/domain/guild-challenge-cost.ts`
- `lib/services/guild-challenge-cost.service.ts`

## POST /api/guild/challenge-cost

### Body

```json
{
  "text": "Iron Ore x2100\nWillow Log x1200"
}
```

Each non-empty line must use `Item Name xQuantity`.

### 200 OK

Returns matched items, tier-1 unit prices, line totals, parse warnings, and the priced grand total.
Latest `market_price_history` tier-1 data is preferred; `items.last_sold_price` is used as the fallback.
