# Internal API - API Inspector

Admin-only tooling for documenting IdleMMO API response shapes from real calls.

Sources:
- `app/api/admin/api-inspector/route.ts`
- `app/api/admin/api-inspector/run/route.ts`
- `app/api/admin/api-inspector/schema/route.ts`
- `lib/services/admin/api-inspector.service.ts`

All routes require `session.user.role === "admin"`.

## GET /api/admin/api-inspector

Returns endpoint specs, active typed schemas, and recent schema observations.

The route seeds default endpoint specs on first use. Specs include path/query params, editable test values, and default test values.

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

Raw responses are not persisted. The DB stores inferred schemas and diff metadata.

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
