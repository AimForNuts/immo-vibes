# Shrine

> [Back to Index](../IdleMMOAPI.md)

---

#### GET `/v1/shrine/progress` — Shrine Progress

Retrieve the current progress of all shrine tiers including effects, completion status, and activation availability.

**Required Scope:** `v1.shrine.progress`

**Example Request**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "User-Agent: YourApp/1.0" \
     https://api.idle-mmo.com/v1/shrine/progress
```

**Example Response**
```json
{
    "progress": [
        {
            "id": 1,
            "tier": {
                "key": "tier_1",
                "name": "Tier 1"
            },
            "effects": [
                {
                    "target": "primary_skill",
                    "attribute": "experience",
                    "value": 10,
                    "value_type": "percentage"
                },
                {
                    "target": "pet-mastery",
                    "attribute": "experience",
                    "value": 10,
                    "value_type": "percentage"
                },
                {
                    "target": "combat",
                    "attribute": "experience",
                    "value": 5,
                    "value_type": "percentage"
                }
            ],
            "current_value": 541180,
            "target_value": 250000,
            "target_remaining": 0,
            "percentage": 100,
            "goal_reached_at": "2025-08-25T16:40:57.000000Z",
            "is_active": true,
            "in_progress": false,
            "can_activate": true
        },
        {
            "id": 2,
            "tier": {
                "key": "tier_2",
                "name": "Tier 2"
            },
            "effects": [
                {
                    "target": "primary_skill",
                    "attribute": "experience",
                    "value": 15,
                    "value_type": "percentage"
                },
                {
                    "target": "pet-mastery",
                    "attribute": "experience",
                    "value": 15,
                    "value_type": "percentage"
                },
                {
                    "target": "bartering",
                    "attribute": "experience",
                    "value": 10,
                    "value_type": "percentage"
                },
                {
                    "target": "combat",
                    "attribute": "experience",
                    "value": 7,
                    "value_type": "percentage"
                }
            ],
            "current_value": 125000,
            "target_value": 550000,
            "target_remaining": 425000,
            "percentage": 22.73,
            "goal_reached_at": null,
            "is_active": false,
            "in_progress": true,
            "can_activate": false
        }
    ],
    "endpoint_updates_at": "2025-08-26T09:35:00.000000Z"
}
```

**Response Fields**

| Field | Type | Description |
|---|---|---|
| `progress` | array | List of shrine tiers and their progress |
| `progress.*.id` | integer | Shrine tier record ID |
| `progress.*.tier` | object | Tier metadata |
| `progress.*.tier.key` | string | Tier key (e.g., `tier_1`) |
| `progress.*.tier.name` | string | Tier display name |
| `progress.*.effects` | array | Bonuses granted when this tier is active |
| `progress.*.effects.*.target` | string | Target of the effect (e.g., `primary_skill`, `combat`) |
| `progress.*.effects.*.attribute` | string | Affected attribute (e.g., `experience`) |
| `progress.*.effects.*.value` | number | Effect magnitude |
| `progress.*.effects.*.value_type` | string | Value type (e.g., `percentage`) |
| `progress.*.current_value` | integer | Contributions collected so far |
| `progress.*.target_value` | integer | Contributions needed to complete the tier |
| `progress.*.target_remaining` | integer | Contributions still needed (`0` if goal reached) |
| `progress.*.percentage` | number | Completion percentage |
| `progress.*.goal_reached_at` | string\|null | Timestamp when goal was reached, or null |
| `progress.*.is_active` | boolean | Whether this tier's bonuses are currently active |
| `progress.*.in_progress` | boolean | Whether contributions are currently being collected |
| `progress.*.can_activate` | boolean | Whether this tier is ready to be activated |
| `endpoint_updates_at` | string | When this endpoint data next updates |
