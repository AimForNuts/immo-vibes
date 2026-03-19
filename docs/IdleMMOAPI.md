# IdleMMO Public API Documentation

> Complete reference for the IdleMMO Public API endpoints and usage.

---

## Base Information

| Property | Value |
|---|---|
| Base URL | `https://api.idle-mmo.com/v1` |
| Authentication | Bearer Token |
| Default Rate Limit | 20 req/min |
| Timestamp Format | UTC ISO 8601 |

---

## Required Headers

```http
Authorization: Bearer YOUR_API_KEY  # required
Accept: application/json
User-Agent: YourApp/1.0.0           # required
```

---

## Rate Limiting

All API requests are rate limited. The default limit is **20 requests per minute**, shared across all API keys for a user unless a custom rate limit is set.

### Rate Limit Headers

| Header | Description |
|---|---|
| `X-RateLimit-Limit` | Maximum requests allowed in the current window |
| `X-RateLimit-Remaining` | Requests remaining in the current window |
| `X-RateLimit-Reset` | Unix timestamp when the rate limit window resets |

---

## Response Codes

| Code | Name | Description |
|---|---|---|
| `200` | Success | Request completed successfully. |
| `400` | Bad Request | See error code for details. |
| `401` | Unauthorized | Invalid or missing API key. |
| `403` | Forbidden | Insufficient permissions or account banned. |
| `404` | Not Found | Endpoint or entity does not exist. |
| `422` | Unprocessable Entity | Validation failed. Check the `errors` field for details. |
| `429` | Too Many Requests | Rate limit exceeded. |

---

## Error Codes

| Code | Description |
|---|---|
| `1` | Missing User-Agent header |

---

## Endpoints

| Category | Endpoints |
|---|---|
| [Authentication](api/authentication.md) | `GET /v1/auth/check` |
| [Combat](api/combat.md) | `GET /v1/combat/world_bosses/list` · `GET /v1/combat/dungeons/list` · `GET /v1/combat/enemies/list` |
| [Items](api/items.md) | `GET /v1/item/search` · `GET /v1/item/{hashed_item_id}/inspect` · `GET /v1/item/{hashed_item_id}/market-history` |
| [Pets](api/pets.md) | `GET /v1/pets/companion-exchange/listings` |
| [Shrine](api/shrine.md) | `GET /v1/shrine/progress` |
| [Character](api/character.md) | `GET /v1/character/{id}/information` · `GET /v1/character/{id}/metrics` · `GET /v1/character/{id}/effects` · `GET /v1/character/{id}/characters` · `GET /v1/character/{id}/museum` · `GET /v1/character/{id}/current-action` · `GET /v1/character/{id}/pets` |
| [Guilds](api/guilds.md) | `GET /v1/guild/{id}/information` · `GET /v1/guild/{id}/members` · `GET /v1/guild/conquest/view` · `GET /v1/guild/conquest/zone/{zone_id}/inspect` |
