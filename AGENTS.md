# Git Workflow — MANDATORY

> Never commit directly to `master`. Every feature or fix must go through a PR.

1. `git pull origin master` — sync before starting
2. `git checkout -b feat/<name>` (or `fix/`, `chore/`)
3. Do all work on the branch
4. Commit and push when work is complete
5. `gh pr create` — open a PR, **do not merge**
6. Ask the user before merging — wait for explicit approval

Skipping this workflow is never acceptable, even for "small" changes.

# Documentation Policy — MANDATORY

Keep these files current after every session that changes behaviour:
- **AGENTS.md** — update when conventions, tools, or workflows change
- **CLAUDE.md** — mirrors AGENTS.md via `@AGENTS.md`; add anything that only Claude needs to know
- **README.md** — update on any breaking change or significant feature addition; keep the "Recent changes" section current

# IdleMMO Domain Knowledge

For game mechanics (combat stat formulas, class bonuses, dungeon thresholds, item types/tiers) read the relevant file in `docs/game-mechanics/` before writing code that touches those areas. Do NOT derive these from training data — values differ from wiki.

| Topic | File |
|---|---|
| Combat stat formulas, multipliers | `docs/game-mechanics/combat-stats.md` |
| Class bonuses and talents | `docs/game-mechanics/classes.md` |
| Dungeon thresholds, HP loss, MF | `docs/game-mechanics/dungeons.md` |
| Item types, quality tiers, tier formula | `docs/game-mechanics/items.md` |

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
