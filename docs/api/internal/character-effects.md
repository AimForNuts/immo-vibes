# Internal API — GET /api/idlemmo/character/[id]/effects

Thin proxy that returns the active effects for a character from the IdleMMO API.

## Request

```
GET /api/idlemmo/character/{hashedId}/effects
Authorization: session cookie
```

**Path param**: `id` — the character's `hashed_id`.

**Requires**: valid session and `idlemmoToken` set.

## Response

### 200 OK

```json
{
  "effects": [
    {
      "character_id": 123,
      "source": "house_component",
      "target": "character",
      "attribute": "max_idle_time",
      "value": 7200000,
      "value_type": "flat",
      "location_id": null
    }
  ]
}
```

See `CharacterEffect` interface in `lib/idlemmo.ts` for the full shape.

### 400 Bad Request

```json
{ "error": "No API token" }
```

### 401 Unauthorized

```json
{ "error": "Unauthorized" }
```

### 500 Internal Server Error

```json
{ "error": "<IdleMMO API error>" }
```

## Usage

Used by `DungeonExplorer.tsx` to calculate max idle time for dungeon planning:
- Effects where `source === "house_component" && attribute === "max_idle_time"` are summed as `effectsHouseBonus` (ms)
- Result is added to the base idle time from `BASE_IDLE_TIME_MS` in `lib/game-constants.ts`
- Results are cached in `sessionStorage` keyed by `effects:{characterId}` — valid until the user clicks "Refresh"

## Source

`app/api/idlemmo/character/[id]/effects/route.ts`
