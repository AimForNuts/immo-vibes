# Authentication

> [Back to Index](../IdleMMOAPI.md)

---

#### GET `/v1/auth/check` — Authentication Check

Verify that your API key is valid and check authentication status.

**Required Scope:** `v1.auth.check`

**Example Request**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "User-Agent: YourApp/1.0" \
     https://api.idle-mmo.com/v1/auth/check
```

**Example Response**
```json
{
    "authenticated": true,
    "user": {
        "id": 12345
    },
    "character": {
        "id": 67890,
        "hashed_id": "c1234567890",
        "name": "ExampleCharacter"
    },
    "api_key": {
        "name": "My Application",
        "rate_limit": 20,
        "expires_at": null,
        "scopes": null
    }
}
```

> **Note:** `scopes` is `null` when the API key has been granted all scopes (the default). It returns a restricted array only when the key has been explicitly limited. `expires_at` is `null` when the key does not expire.

**Response Fields**

| Field | Type | Description |
|---|---|---|
| `authenticated` | boolean | Whether the API key is valid |
| `user.id` | integer | User ID |
| `character.id` | integer | Character ID |
| `character.hashed_id` | string | Hashed character ID |
| `character.name` | string | Character name |
| `api_key.name` | string\|null | API key name |
| `api_key.rate_limit` | integer | Requests allowed per minute |
| `api_key.expires_at` | string\|null | Expiry timestamp (ISO 8601) or null |
| `api_key.scopes` | array\|null | List of granted scopes |
