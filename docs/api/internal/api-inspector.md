# Internal API - API Inspector

Admin-only tooling for documenting IdleMMO API response shapes from real calls.
Persistence lives in Cloudflare D1 (`api_endpoint_specs`, `api_response_schemas`, `api_schema_observations`) through `lib/services/admin/api-inspector.service.ts`.

Sources:
- `app/api/admin/api-inspector/route.ts`
- `app/api/admin/api-inspector/run/route.ts`
- `app/api/admin/api-inspector/schema/route.ts`
- `lib/services/admin/api-inspector.service.ts`

All routes require `session.user.role === "admin"`.

## GET /api/admin/api-inspector

Returns endpoint specs, active typed schemas, and recent schema observations.

The route seeds default endpoint specs on first use. Specs include path/query params, editable test values, and default test values.

If the inspector tables are temporarily unavailable, the route returns the built-in endpoint catalog with `persistenceAvailable: false` so the dropdown still works. Schema saves and observation history require the DB tables.

### Built-in Endpoint Catalog

| Key | Path |
|---|---|
| `auth.check` | `/v1/auth/check` |
| `locations.list` | `/v1/world/locations/list` |
| `combat.worldBosses` | `/v1/combat/world_bosses/list` |
| `combat.dungeons` | `/v1/combat/dungeons/list` |
| `combat.enemies` | `/v1/combat/enemies/list` |
| `item.search` | `/v1/item/search` |
| `item.inspect` | `/v1/item/{hashedId}/inspect` |
| `item.marketHistory` | `/v1/item/{hashedId}/market-history` |
| `character.information` | `/v1/character/{hashedId}/information` |
| `character.metrics` | `/v1/character/{hashedId}/metrics` |
| `character.effects` | `/v1/character/{hashedId}/effects` |
| `character.characters` | `/v1/character/{hashedId}/characters` |
| `character.museum` | `/v1/character/{hashedId}/museum` |
| `character.currentAction` | `/v1/character/{hashedId}/current-action` |
| `character.pets` | `/v1/character/{hashedId}/pets` |
| `pets.companionExchangeListings` | `/v1/pets/companion-exchange/listings` |
| `guild.information` | `/v1/guild/{id}/information` |
| `guild.members` | `/v1/guild/{id}/members` |
| `guild.activity` | `/v1/guild/{id}/activity` |
| `guild.energizingPool` | `/v1/guild/{id}/energizing-pool/information` |
| `guild.hall` | `/v1/guild/{id}/hall` |
| `guild.conquest` | `/v1/guild/conquest/view` |
| `guild.conquestZone` | `/v1/guild/conquest/zone/{zoneId}/inspect` |
| `shrine.progress` | `/v1/shrine/progress` |

## POST /api/admin/api-inspector/run

Runs one curated IdleMMO endpoint using the admin user's IdleMMO token.

### Body

```json
{
  "endpointKey": "guild.hall",
  "params": {
    "id": 1
  }
}
```

### 200 OK

Returns:
- `path`: resolved IdleMMO path that was called
- `response`: raw response for the current UI session only
- `inferredSchema`: typed schema inferred from the response
- `diff`: new fields, missing fields, and type conflicts compared with the active schema
- `observation`: persisted observation metadata

Raw responses are not persisted. D1 stores inferred schemas and diff metadata.

## PATCH /api/admin/api-inspector/schema

Updates endpoint config or response schemas.

### Actions

| Action | Purpose |
|---|---|
| `save-spec` | Saves editable endpoint config, including test values. |
| `save` | Saves a provided active schema. |
| `merge` | Merges a newly inferred schema into the current active schema. |
| `override` | Replaces the active schema with the manually edited schema. |
| `deprecate` | Marks selected missing fields as deprecated. |

Missing fields are never auto-deprecated. Admins must explicitly choose the deprecate action.

When persistence is unavailable, save actions return `200 OK` with `persistenceAvailable: false` and a warning message. The UI keeps the latest schema draft visible, but no schema/config/observation data is saved until the inspector tables exist.
