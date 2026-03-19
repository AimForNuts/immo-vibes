# Pets

> [Back to Index](../IdleMMOAPI.md)

---

#### GET `/v1/pets/companion-exchange/listings` — Companion Exchange Listings

Retrieve the pets currently listed on the companion exchange along with their asking price.

**Required Scope:** `v1.pets.companion_exchange.listings`

**Parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `page` | integer | No | Page number for pagination (default: `1`) |

**Example Request**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "User-Agent: YourApp/1.0" \
     https://api.idle-mmo.com/v1/pets/companion-exchange/listings
```

**Example Response**
```json
{
    "listings": [
        {
            "pet": {
                "character_pet_id": 123,
                "pet_id": 45,
                "name": "Lunark",
                "quality": "MYTHIC",
                "level": 42,
                "image_url": "https://cdn.idle-mmo.com/images/pets/lunark.png"
            },
            "cost": {
                "currency": "gold",
                "amount": 250000
            }
        }
    ],
    "pagination": {
        "current_page": 1,
        "has_more": true,
        "next_page": 2
    },
    "endpoint_updates_at": "2025-12-21T14:10:00.000000Z"
}
```

**Response Fields**

| Field | Type | Description |
|---|---|---|
| `listings` | array | List of companion exchange listings |
| `listings.*.pet` | object | Pet details |
| `listings.*.pet.character_pet_id` | integer | Character's pet instance ID |
| `listings.*.pet.pet_id` | integer | Base pet type ID |
| `listings.*.pet.name` | string | Pet name |
| `listings.*.pet.quality` | string | Pet quality |
| `listings.*.pet.level` | integer | Pet level |
| `listings.*.pet.image_url` | string | Pet image URL |
| `listings.*.cost` | object | Listing price details |
| `listings.*.cost.currency` | string | Currency type (e.g., `gold`) |
| `listings.*.cost.amount` | integer | Amount of currency required |
| `pagination.current_page` | integer | Current page number |
| `pagination.has_more` | boolean | Whether more pages exist |
| `pagination.next_page` | integer\|null | Next page number, or null if last page |
| `endpoint_updates_at` | string | When this endpoint data next updates |
