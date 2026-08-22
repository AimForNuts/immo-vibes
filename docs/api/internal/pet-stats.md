# Internal API — Pet Stats

## GET `/api/characters/[id]/pet-stats`

Returns all stored combat stats for the equipped pet of a character. Stored pet rows live in Cloudflare D1 table `character_pets` through `lib/services/character-pets.service.ts`.

**Auth:** Required (session cookie)

**Response 200:**
```json
{
  "attackPower": 78,
  "protection": 62,
  "agility": 99,
  "accuracy": 77,
  "maxStamina": 264,
  "movementSpeed": 20.5,
  "criticalChance": 9,
  "criticalDamage": 41,
  "imageUrl": "https://...",
  "quality": "RARE"
}
```

Any combat stat field may be `null` if the user has not entered it. `imageUrl` may be null. Returns 404 if no pet has been synced.

---

## PATCH `/api/characters/[id]/pet-stats`

Saves manually entered stats. All fields optional; omitted fields are unchanged.
Numeric fields must be non-negative numbers. Integer stat fields must be non-negative integers.

**Auth:** Required (session cookie)

**Request body:**
```json
{
  "attackPower": 78,
  "protection": 62,
  "agility": 99,
  "accuracy": 77,
  "maxStamina": 264,
  "movementSpeed": 20.5,
  "criticalChance": 9,
  "criticalDamage": 41
}
```

Returns 404 if no pet row exists (user must sync first via `POST /api/characters/[id]/sync-pet`).

**Response 200:** `{ "ok": true }`

**Errors:**

| Status | Body | Cause |
|---|---|---|
| 400 | `{ "error": "Invalid JSON body" }` | Request body could not be parsed as JSON. |
| 400 | `{ "error": "JSON body must be an object" }` | Request JSON was not an object. |
| 400 | `{ "error": "<field> must be a non-negative integer" }` | Integer stat field was invalid. |
| 400 | `{ "error": "movementSpeed must be a non-negative number" }` | Movement speed was invalid. |
