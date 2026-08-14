# Improvement Backlog

This backlog captures project improvements discovered from the current file inventory and existing docs. It is intentionally product-and-engineering focused so future iterations can pick a thin slice, update the relevant spec, and ship it through the normal PR workflow.

Priority labels:

- **P0**: correctness, security, deploy health, or data integrity.
- **P1**: high leverage for maintainability, user value, or operational visibility.
- **P2**: polish, expansion, or developer experience.

---

## Recommended Next Moves

| Priority | Area | Improvement | Why It Matters |
|---|---|---|---|
| Done | Documentation | Bring `app/api/README.md` up to date with all current admin, cron, item zone, dungeon, pet, and market behavior. | Completed in `feat/project-docs`; route discovery now reflects the current route files and calls out remaining detailed-doc gaps. |
| P0 | API docs | Add missing internal API docs for admin zones/users/items/dungeons routes and cron routes. | The codebase has many route handlers; complete request/response docs reduce risky route edits. |
| P0 | Sync jobs | Clarify or retire `app/api/cron/sync-market/route.ts`. | The project map documents `sync-prices`; a similarly named cron route increases maintenance ambiguity. |
| P1 | Admin world data | Implement real enemy and world boss sync or clearly mark the pages/routes as manual/picker-only. | Tables and placeholders exist, but the lifecycle is not fully specified. |
| P1 | Auth | Replace the password recovery placeholder with a working better-auth recovery flow. | It is a visible account-management gap. |
| P1 | Validation | Audit route handlers for consistent Zod or equivalent boundary validation. | The project convention requires boundary validation, but this is easiest to erode over time. |
| P1 | Tests | Add focused tests for market price fallback/cache behavior and gear stat tier calculations. | These are calculation/data correctness hotspots. |
| P1 | Observability | Add structured sync job logs/status views that persist enough detail for failures and partial progress. | Sync routes touch external APIs and rate limits; failures should be diagnosable without digging through deployment logs. |
| P2 | i18n | Add a translation completeness check for `messages/en.json` and `messages/pt.json`. | Prevents missing UI copy as features expand. |
| P2 | Docs | Add short README files for Forge Planner, Dashboard Home, Settings, and Characters to match existing feature READMEs. | Several major areas have docs, but not all feature folders do. |

---

## Product Improvements

### Dashboard Home

- Add per-card loading/error states that distinguish stale cached character data from fresh API failures.
- Add a "last refreshed" affordance for character cache freshness.
- Expand shortcut card options as new feature areas become stable.
- Consider a compact account health panel: API token valid, primary character configured, latest sync status.

### Characters And Pets

- Add a clearer pet stat provenance model: API-synced stats, manually entered stats, and derived combat contribution.
- Add "last synced" warnings when pet data is old.
- Provide a comparison view between character base stats, pet contribution, and gear contribution.
- Add tests around pet sync upsert behavior and pet stat PATCH validation.

### Market Browser

- Add more explicit empty states for tabs with no synced data, no search results, and price cache misses.
- Add sorting for price, quality, type, and first-seen date where the DB query supports it efficiently.
- Add a bulk inspect/sync status indicator on item detail cards.
- Cache crafted-by lookup responses or include recipe relationships in the item detail route when efficient.
- Improve admin zone association feedback after save, including stale zone list handling.

### Investments

- Add alert thresholds and notification-ready metadata, even if delivery channels come later.
- Add chart ranges beyond latest-history lookup: 7d, 30d, all-time.
- Add "tracked tier" editing without deleting/re-adding an item.
- Add unique user/item/tier constraints if not already enforced at the schema level.

### Forge Planner

- Add save/load planner lists.
- Support material availability input so users can see missing quantities.
- Add recipe filters by level requirement, quality, result type, and material name.
- Link required materials back to market detail/price views.

### Gear Calculator

- Add a dedicated comparison mode for two presets.
- Add derived totals from character + pet + gear, not just gear where applicable.
- Add import-from-current-character gear if the IdleMMO API exposes enough equipment data.
- Add tests for slot constraints, weapon style behavior, and tier modifier edge cases.

### Combat Planner

- Surface assumptions near outputs: formulas, missing enemy stats source, stance/scaling inputs.
- Add shareable presets for common enemy/character/stat configurations.
- Add coverage for enemy scaling hooks and edge cases around missing static enemy stats.
- Explore using DB-backed enemies when the admin enemy lifecycle is complete.

### Dungeons Explorer

- Add dungeon run outcome explanations so users can see which stat or threshold is limiting them.
- Add loot EV estimates using market prices where data exists.
- Add member/non-member effect comparison, since membership is already cached on characters.
- Add tests for full readiness calculations beyond pure difficulty helpers.

### Admin Panel

- Add a sync history table instead of relying only on current `sync_state`.
- Add dry-run previews for destructive admin operations.
- Add clearer permissions documentation for every admin route.
- Complete enemy/world boss data lifecycle: sync, edit, associate, view, test.
- Add bulk item actions with progress and cancellation semantics.

### Settings And Account

- Finish password recovery.
- Add API token validation status and timestamp.
- Add a primary character selector populated from the token instead of requiring manual ID entry.
- Add account deletion/export affordances if the product needs them.

---

## Engineering Improvements

### Documentation Consistency

- Update `app/api/README.md` to reflect current `POST` cron handlers, admin route breadth, zone routes, dungeons routes, and pet routes.
- Add an internal API doc per route group under `docs/api/internal/`.
- Add a "docs required when touching this area" checklist to feature READMEs.
- Normalize Markdown encoding where copied punctuation currently renders as mojibake in some shell output.

### Architecture And Separation Of Concerns

- Continue extracting complex UI-adjacent business rules into `lib/domain/`, `lib/services/`, or feature-local `lib/` modules.
- Review larger orchestrator components for pure functions that can be tested independently.
- Keep route handlers thin: auth/session, validation, service call, response shaping.
- Prefer shared service modules for admin CRUD where route handlers currently duplicate patterns.

### Data And Sync Reliability

- Add persisted sync run history: job, run id, started/completed, status, counters, error summary.
- Add rate-limit metrics per IdleMMO endpoint.
- Document retry/backoff behavior in one place and keep admin/cron implementations aligned.
- Add idempotency notes for each sync route.
- Define expected recovery behavior after partial sync failures.

### API Validation

- Standardize query parsing and request body validation for internal APIs.
- Document response envelopes for list routes: pagination, filters, rows, errors.
- Add tests for invalid input on key APIs, especially admin mutations.
- Ensure all user-specific routes verify ownership before reading or mutating data.

### Testing

- Add unit tests for:
  - Gear tier stat calculations.
  - Market price fallback and tier normalization.
  - Dashboard preference validation.
  - Admin service filtering/pagination helpers.
- Add integration tests for:
  - Investments CRUD and history.
  - Pet sync and pet stats.
  - Admin zone associations.
- Expand Playwright smoke coverage for:
  - Market.
  - Forge Planner.
  - Gear.
  - Dungeons.
  - Settings.
  - Admin pages for admin-auth storage state.

### Developer Experience

- Add a docs index page under `docs/README.md`.
- Add script shortcuts for common checks: typecheck, unit tests, e2e smoke, integration tests.
- Add a `.env.example` audit to include every env var used by code/tests/deploy.
- Add a local setup note for symlinked `node_modules` inside worktrees.
- Consider a small route inventory script that regenerates an API route list for docs review.

### Internationalization

- Add a CI check that all locales contain the same keys.
- Track hardcoded user-facing strings in feature areas that are not fully translated.
- Document namespace conventions for new message keys.

### Security And Permissions

- Create an admin route permission matrix.
- Audit all admin mutations for role checks and ownership checks.
- Avoid exposing raw upstream API details to clients unless needed.
- Review user deletion and character dissociation flows for cascade behavior and irreversible action confirmation.

### UI And Accessibility

- Add keyboard and focus-state checks for modals, dropdowns, and admin table actions.
- Ensure loading, empty, and error states exist for every data-heavy page.
- Check responsive behavior for dense admin and market UIs.
- Add accessible labels for icon-only actions if any are missing.

---

## Documentation Gaps To Close

| Gap | Suggested File |
|---|---|
| Current API route inventory and route groups | `app/api/README.md` |
| Internal admin item routes | `docs/api/internal/admin-items.md` |
| Internal admin user routes | `docs/api/internal/admin-users.md` |
| Internal admin zone routes | `docs/api/internal/admin-zones.md` |
| Internal cron routes | `docs/api/internal/cron-sync.md` |
| Dashboard home behavior | `app/(dashboard)/dashboard/README.md` |
| Settings/account behavior | `app/(dashboard)/dashboard/settings/README.md` |
| Characters/pets behavior | `app/(dashboard)/dashboard/characters/README.md` |
| Forge Planner behavior | `app/(dashboard)/dashboard/forge-planner/README.md` |
| Test/environment setup | `docs/testing.md` |
| Deployment and cron operations | `docs/operations.md` |

---

## Candidate Iteration Specs

These are good candidates for future `docs/specs/YYYY-MM-DD-*.md` files before implementation:

- Password recovery flow.
- Admin sync observability and sync run history.
- Enemy/world boss sync lifecycle.
- Market price history charts and alerts.
- Gear preset comparison.
- Dungeon loot expected-value planner.
- Route/API documentation completion.
- i18n hardcoded-string cleanup.

---

## How To Use This Backlog

For each improvement:

1. Pick one thin outcome.
2. Write or update a short spec in `docs/specs/`.
3. Update `docs/project-map.md` with the target files and data.
4. Implement in a worktree branch.
5. Add focused tests.
6. Update this backlog when the item is done or re-scoped.
