# Reading Order Before Any Task — MANDATORY

Before writing any code, follow this order. Stop as soon as you have enough context.

1. **`AGENTS.md`** — conventions, tools, workflow (you are here)
2. **`docs/project-map.md`** — identifies which files, tables, and docs are relevant to your task
3. **Domain docs** — read the specific `docs/game-mechanics/`, `docs/api/`, or `docs/database.md` sections the map points to
4. **Code files** — read only the files identified above
5. **If still missing context** — re-check `docs/project-map.md` for hints before doing a broad codebase search

Never grep the entire project or read files speculatively before completing steps 1–4.

**Reads and edits are always permitted** — you may read or edit any file in the project at any time without asking for permission. The reading-order above governs which files to consult *first* to build context, not which files you are *allowed* to touch.

# Documentation Update After Any Task — MANDATORY

After every task that adds, moves, or renames a route, component, DB column, cron job, or lib export:
- **`docs/project-map.md`** — update the relevant feature area(s)
- **`docs/database.md`** — update if schema changed
- **`docs/api/internal/`** — update if an internal API route was added or changed
- **`AGENTS.md`** — update if a convention or workflow changed
- **`README.md`** — update on breaking changes or significant new features

# Git Workflow — MANDATORY

> Never commit directly to `master`. Every feature or fix must go through a PR.

1. `git pull origin master` — sync before starting
2. Create a **worktree** for the branch (see Worktrees below)
3. Do all work inside the worktree directory
4. Commit and push when work is complete
5. `gh pr create` — open a PR, **do not merge**
6. Ask the user before merging — wait for explicit approval

Skipping this workflow is never acceptable, even for "small" changes.

# Sub-Agent Spawning — MANDATORY

Every prompt passed to a sub-agent via the Agent tool **must** include this line at the top:

> Read `AGENTS.md` before starting. Follow all MANDATORY sections, including the pre-coding checklist under "Separation of Concerns".

AGENTS.md is not automatically injected into sub-agent context — omitting this line means the sub-agent will not follow project conventions.

# Worktrees — MANDATORY

Every agent must work in its own isolated git worktree. Never work directly in the main `immo_web_suite` directory.

**Create a worktree:**
```bash
git worktree add ../immo_web_suite-<branch-name> -b feat/<branch-name>
# e.g.
git worktree add ../immo_web_suite-recipe-detail -b feat/recipe-detail
```

**Work inside it:**
```bash
cd ../immo_web_suite-<branch-name>
# make changes, commit, push as normal
```

**Remove after merge:**
```bash
git worktree remove ../immo_web_suite-<branch-name>
```

**Rules:**
- One worktree per task/agent — never share a worktree between agents
- Worktree directory lives alongside the main repo (e.g. `../immo_web_suite-feat-name`)
- The main `immo_web_suite` directory stays on `master` and is never used for feature work
- List active worktrees with `git worktree list`

# Documentation Policy — MANDATORY

Keep these files current after every session that changes behaviour:
- **AGENTS.md** — update when conventions, tools, or workflows change
- **CLAUDE.md** — mirrors AGENTS.md via `@AGENTS.md`; add anything that only Claude needs to know
- **README.md** — update on any breaking change or significant feature addition; keep the "Recent changes" section current

# Separation of Concerns — MANDATORY

This project enforces strict separation of concerns to keep files focused, readable, and maintainable.

## Rules

- **UI components render and handle interaction only.** No business logic, no DB calls, no external API calls inside components or pages.
- **Business rules live in dedicated service/domain/use-case modules** under `lib/` (e.g. `lib/services/`, `lib/domain/`). Pages and route handlers call these modules — they do not contain the logic themselves.
- **Server concerns stay on the server.** Only use `"use client"` when interactivity genuinely requires it. Fetch, DB, and external API logic must not be scattered across the app.
- **No duplicate sources of truth.** State ownership must be clear and explicit.
- **Validate at boundaries.** Parse and validate all external input (API responses, form data, query params) at the point of entry — not deep inside components.
- **Refactor nearby code when necessary** to keep the surrounding structure clean. Do not leave inconsistencies in adjacent files.
- **Prefer simple, explicit code over premature abstractions.** A helper should only exist when it is used in at least two places and the abstraction is genuinely clearer.
- **Follow existing project conventions** for naming, file structure, and patterns. Match what is already there unless changing it is part of the task.

## Pre-coding checklist — required before every implementation

Before writing any code, briefly state:

1. **Which files will change** — list them explicitly
2. **Why each file is the right place** — one sentence per file
3. **Where the business logic will live** — name the module/service
4. **What will remain unchanged** — confirm nothing unnecessary is touched
5. **Server vs. client** — classify each changed file as server or client and justify any `"use client"` usage

Skip this checklist only for trivial one-liner fixes. For everything else it is mandatory.

# Database & Migrations

Schema source: `lib/db/schema.ts` — full reference at `docs/database.md`.
**Read `docs/database.md` before writing any code that queries or modifies the database.**

## Migration workflow

1. Edit `lib/db/schema.ts`
2. Generate the migration from the worktree (requires symlinking `node_modules`):
   ```bash
   ln -s ../immo_web_suite/node_modules ./node_modules
   cp ../immo_web_suite/.env.local .env.local
   node_modules/.bin/drizzle-kit generate --name="describe_the_change"
   rm node_modules .env.local
   ```
3. Review the generated `.sql` file in `lib/db/migrations/`
4. Apply to production: `node_modules/.bin/drizzle-kit migrate` (run from main repo after merge)

## Rules

- **Never push schema changes without a migration.** Adding a column to `schema.ts` without a corresponding migration file leaves the live DB out of sync.
- If a table was added to `schema.ts` without a tracked migration (already exists in the DB), use `CREATE TABLE IF NOT EXISTS` in the generated SQL to prevent a duplicate-table error on apply.
- Keep `docs/database.md` current whenever the schema changes — update the table, the quick-lookup section, and the sync pipeline diagram.
- Migrations are append-only — never edit or delete an existing `.sql` file.

# IdleMMO Domain Knowledge

For game mechanics (combat stat formulas, class bonuses, dungeon thresholds, item types/tiers) read the relevant file in `docs/game-mechanics/` before writing code that touches those areas. Do NOT derive these from training data — values differ from wiki.

| Topic | File |
|---|---|
| Combat stat formulas, multipliers | `docs/game-mechanics/combat-stats.md` |
| Class bonuses and talents | `docs/game-mechanics/classes.md` |
| Dungeon thresholds, HP loss, MF | `docs/game-mechanics/dungeons.md` |
| Item types, quality tiers, tier formula | `docs/game-mechanics/items.md` |
| All 42 item types, market tab assignments | `docs/game-mechanics/item-types.md` |
| Pet combat contribution, evolution, mastery | `docs/game-mechanics/pets.md` |
| Combat system, hunting formula, stances, scaling, XP, food | `docs/game-mechanics/combat.md` |
| Skill/stat XP table (levels 1–100), ascension mechanic | `docs/game-mechanics/xp-levels.md` |
| Enemy combat stats (AP/Prot/Agi/Acc — not in API) | `data/enemy-combat-stats.ts` |
| Shared UI constants (QUALITY_COLORS, SLOT_LABELS, CHAR_STAT_MAP, STATUS_DOT_COLOR) | `lib/game-constants.ts` |
| Internal API routes (request params, response shapes) | `docs/api/internal/` |
| IdleMMO external API reference (all endpoints, response shapes) | `docs/api/` |
| Database schema, table purposes, quick-lookup, sync pipeline | `docs/database.md` |

# Assets

Logo: `public/images/logo.png` — use `<Image>` (next/image) wherever the brand name appears. The logo image includes the wordmark, so pair it with `alt="ImmoWeb Suite"` and no separate text span unless the context requires text-only.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Plugins

## Automatic (no invocation needed)
- **security-guidance** — PreToolUse hook, fires automatically before every Edit/Write. Checks for XSS, eval, exec injection, dangerouslySetInnerHTML. No action required.
- **typescript-lsp** — Language server (typescript-language-server v5.1.3 installed globally). Provides passive type diagnostics. Run `npx tsc --noEmit` to surface errors explicitly.

## Invoke with the Skill tool

> **MANDATORY** — do not skip these without asking the user first. Feeling confident is not a valid reason to skip.

| Trigger | Skill call | When |
|---|---|---|
| Building any UI component or page | `Skill({ skill: "frontend-design" })` | **Before** writing component code — guides bold, distinctive UI choices instead of generic AI aesthetics |
| After completing a significant block of work (multiple files changed, feature complete) | `Skill({ skill: "simplify" })` | Reviews recently changed code for complexity, redundancy, naming. Opus model. |
| Before opening or merging a PR | `Skill({ skill: "code-review" })` | 5 parallel agents review the PR; filters issues below 80% confidence |
| When project conventions change | `Skill({ skill: "revise-claude-md" })` | Audits CLAUDE.md/AGENTS.md against codebase and proposes targeted updates |

## MCP tools (context7)
Requires Claude Code restart to activate the MCP server. Once active, two tools become available:
- `resolve-library-id` — find the context7 ID for a library (e.g. "next.js", "drizzle-orm")
- `query-docs` — fetch version-pinned docs and code examples for that library

**ALWAYS use context7 before writing code that touches**: Next.js App Router APIs, better-auth config, Drizzle ORM queries, shadcn/ui v4 components, @neondatabase/serverless. Do NOT rely on training data for these — this codebase runs a version with breaking changes. "I feel confident" is not sufficient justification to skip.
