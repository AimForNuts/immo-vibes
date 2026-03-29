# Internal API — Pet Stats

## GET `/api/characters/[id]/pet-stats`

Returns all stored combat stats for the equipped pet of a character.

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
