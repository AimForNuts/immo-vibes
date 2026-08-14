# Admin User Routes

Admin-only endpoints for the `/dashboard/admin/users` screen.

Sources:
- `app/api/admin/users/route.ts`
- `app/api/admin/users/[id]/route.ts`
- `app/api/admin/users/[id]/characters/[charId]/route.ts`
- `lib/services/admin/users.service.ts`

All routes require an authenticated session with `session.user.role === "admin"`.

---

## GET /api/admin/users

Returns paginated users with their cached characters.

### Query Parameters

| Parameter | Type | Default | Notes |
|---|---|---|---|
| `page` | number | `1` | Values below 1 become 1. Invalid numbers become 1. |
| `pageSize` | number | `25` | Clamped to 1-100. Invalid numbers become 25. |
| `search` | string | none | Case-insensitive partial match on email, username, or name. |
| `role` | string | none | Exact match on `user.role`. |

### 200 OK

```json
{
  "data": [
    {
      "id": "user_123",
      "name": "Admin",
      "email": "admin@example.com",
      "username": "admin",
      "role": "admin",
      "createdAt": "2026-08-14T10:30:00.000Z",
      "characters": [
        {
          "id": 42,
          "hashedId": "char_hash",
          "name": "Main",
          "class": "WARRIOR"
        }
      ]
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 25
}
```

### Errors

| Status | Body | Cause |
|---|---|---|
| 403 | `{ "error": "Forbidden" }` | Missing session or non-admin user. |

---

## PATCH /api/admin/users/[id]

Updates a user's email and/or password.

`id` is `user.id`.

### Request Body

```json
{
  "email": "new@example.com",
  "newPassword": "new-password"
}
```

Both fields are optional, but an empty body is effectively a no-op and still returns `{ "ok": true }`.

### 200 OK

```json
{ "ok": true }
```

### Errors

| Status | Body | Cause |
|---|---|---|
| 400 | `{ "error": "<message>" }` | Email update or Better Auth password update failed. |
| 403 | `{ "error": "Forbidden" }` | Missing session or non-admin user. |

### Side Effects

- `email` updates `user.email` and `user.updated_at`.
- `newPassword` is applied through `auth.api.setUserPassword`.

---

## DELETE /api/admin/users/[id]

Deletes a user.

`id` is `user.id`.

### 204 No Content

Empty response body.

### Errors

| Status | Body | Cause |
|---|---|---|
| 403 | `{ "error": "Forbidden" }` | Missing session or non-admin user. |

### Side Effects

Deletes the `user` row. Character rows cascade via the foreign key on `characters.user_id`.

---

## DELETE /api/admin/users/[id]/characters/[charId]

Dissociates a cached character from a user.

`id` is `user.id`. `charId` is the numeric `characters.id` primary key.

### 204 No Content

Empty response body.

### Errors

| Status | Body | Cause |
|---|---|---|
| 403 | `{ "error": "Forbidden" }` | Missing session or non-admin user. |

### Side Effects

Deletes the matching row from `characters` where both `characters.id` and `characters.user_id` match the path parameters.

