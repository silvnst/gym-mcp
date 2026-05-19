# Gym Tracker

A personal gym tracking app with workout plan management, session execution, history, and a Claude.ai-connected MCP server for analysis and voice-logging workouts.

## Run & Operate

### Development (two separate servers)

- `pnpm --filter @workspace/api-server run dev` — compile + start the API server on port 8080
- `pnpm --filter @workspace/gym-tracker run dev` — start the Vite dev server (port from `$PORT`)

### Production / Replit deployment (single server)

The frontend is built into a static bundle and served by the Express server. Only one port (8080 → externalPort 80) is exposed.

```sh
# Build frontend, then start Express (serves both API and static files)
pnpm --filter @workspace/gym-tracker build && pnpm --filter @workspace/api-server start
```

This is wired up in `.replit` under `[deployment.run]` so Replit runs it automatically on deploy.

### Other commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

### Required secrets

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres connection string |
| `PORT` | Yes | Port the Express server listens on (use `8080` on Replit) |
| `MCP_SECRET` | Recommended | If set, `/mcp` requires `?token=<value>` on every request — primary auth guard for the MCP endpoint |
| `FRONTEND_ORIGIN` | No | Restricts CORS to a specific origin (e.g. `https://your-app.replit.app`); defaults to `*` |

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- **Frontend**: React 18, Vite, Wouter (routing), TanStack Query, shadcn/ui, Tailwind CSS
- **API**: Express 5
- **DB**: PostgreSQL + Drizzle ORM (5 tables: plans, plan_exercises, sessions, session_exercises, sets)
- **Validation**: Zod
- **MCP**: @modelcontextprotocol/sdk — Streamable HTTP transport (spec 2025-03-26)
- **API codegen**: Orval (from OpenAPI spec → React Query hooks + Zod schemas)
- **Build**: esbuild (ESM bundle for API server)

## Where things live

### Backend
- `lib/api-spec/openapi.yaml` — source of truth for all REST API contracts
- `lib/db/src/schema/index.ts` — Drizzle ORM schema (all 5 tables + relations)
- `artifacts/api-server/src/routes/` — REST route handlers (plans, sessions, sets, health)
- `artifacts/api-server/src/app.ts` — Express setup; MCP_SECRET query-param guard at lines 39–47
- `artifacts/api-server/src/mcp/server.ts` — MCP server with all 12 tools

### Frontend
- `artifacts/gym-tracker/src/App.tsx` — router setup (Wouter)
- `artifacts/gym-tracker/src/pages/home.tsx` — Plans list (create, edit, delete)
- `artifacts/gym-tracker/src/pages/start.tsx` — Start workout (from plan or empty)
- `artifacts/gym-tracker/src/pages/session.tsx` — Active session recording
- `artifacts/gym-tracker/src/pages/session-detail.tsx` — Post-session summary (target vs actual)
- `artifacts/gym-tracker/src/pages/history.tsx` — Paginated session history
- `artifacts/gym-tracker/src/pages/plan-form.tsx` — Plan create/edit form

### Generated (do not edit manually)
- `lib/api-client-react/src/generated/` — React Query hooks
- `lib/api-zod/src/generated/` — Zod schemas

## Architecture decisions

- MCP uses Streamable HTTP transport (MCP spec 2025-03-26) at `POST /mcp` — required by Claude.ai remote connectors
- MCP auth uses `MCP_SECRET` query-param guard: if the env var is set, every `/mcp` request must include `?token=<secret>`; if unset the endpoint is open (local dev only)
- A fresh `Server` instance from `@modelcontextprotocol/sdk` is created per connection — the SDK forbids connecting one `Server` to more than one transport simultaneously
- Cascade deletes: plan → plan_exercises; session → session_exercises → sets
- Finish button in active session is blocked via `useIsMutating()` to prevent navigating away before pending set saves flush
- `lib/api-zod/src/index.ts` only re-exports `./generated/api` (not `./generated/types`) to avoid name collisions with Orval-generated Zod schemas

## Product

### Web App

| Page | Path | What it does |
|---|---|---|
| Plans | `/` | List all plans; create, edit, or delete |
| Start Workout | `/start` | Pick a plan (exercises pre-populated) or start an empty session |
| Active Session | `/session/:id` | Log sets (weight + reps); add exercises mid-session; delete sets; Finish saves and redirects |
| Session Detail | `/history/:id` | Target vs actual table (Target kg / Actual kg / Target Reps / Actual Reps / Vol) per set |
| History | `/history` | Paginated session list (10/page, prev/next) |
| Plan Form | `/plans/new`, `/plans/:id/edit` | Create or edit a plan; up/down arrows to reorder exercises |

### MCP Tools for Claude.ai

#### Read tools

| Tool | Input | Description |
|---|---|---|
| `get_training_context` | — | One-shot context: last 3 sessions, all PRs, overdue exercises (14+ days), volume trend (last 2 weeks vs prior 2 weeks) |
| `get_history` | `limit` (default 10, max 50), `after`, `before` (YYYY-MM-DD) | Recent sessions with full exercises + sets, newest first |
| `get_session_detail` | `session_id` | Full detail of one session |
| `get_plans` | — | All workout plans with exercises and targets |
| `get_prs` | — | Personal record (heaviest set) per exercise, alphabetically |
| `get_volume_by_week` | `weeks` (default 8, max 52) | Total volume (reps × kg) per exercise per ISO week |
| `get_exercise_history` | `exercise_name` | All sessions for an exercise grouped by date, with hit_target flag per set |

#### Write tools

| Tool | Input | Description |
|---|---|---|
| `create_plan` | `name`, `exercises[]` (+ optional `notes`) | Creates a new workout plan with exercises atomically |
| `update_plan` | `plan_id`, `name`, `exercises[]` (+ optional `notes`) | Replaces all exercises for a plan atomically |
| `delete_plan` | `plan_id` | Permanently deletes a plan (sessions linked to it keep their data) |
| `log_session` | `date`, `name`, `exercises[]` (+ optional `notes`) | Creates a session with all exercises and sets in one atomic call |
| `delete_session` | `session_id` | Permanently deletes a session and all its exercises/sets |

**`create_plan` / `update_plan` exercise shape:**
```json
{
  "name": "Back Squat",
  "target_sets": 4,
  "target_reps": 5,
  "target_weight_kg": 102.5,
  "notes": "Belt on working sets"
}
```

**`log_session` input shape:**
```json
{
  "date": "2026-05-18",
  "name": "Push A",
  "notes": "Felt strong",
  "exercises": [
    {
      "name": "Back Squat",
      "sets": [
        { "reps": 5, "weight_kg": 102.5 },
        { "reps": 5, "weight_kg": 102.5 }
      ]
    }
  ]
}
```

## Connecting Claude.ai

1. Go to **Claude.ai → Settings → Connectors → Add custom connector**
2. Set the **Remote MCP server URL** to: `https://<deployed-host>/mcp`
   - If `MCP_SECRET` is configured (recommended), append the token: `https://<deployed-host>/mcp?token=<your-secret>`
3. Save — Claude discovers all 12 tools immediately, no authorization step required

**Example things to say to Claude:**
- _"Give me a full training context — what have I done recently, any overdue exercises?"_
- _"Log today's session: Push A — bench press 4×8 at 80kg, OHP 3×10 at 50kg"_
- _"Create a new plan called 'PPL Push' with bench press 4×8 at 80kg and OHP 3×10 at 50kg"_
- _"What are my current PRs?"_
- _"Show me all my squat sessions"_
- _"How has my squat volume changed over the last 6 weeks?"_
- _"Delete yesterday's session"_

## Gotchas

- After changing `lib/api-spec/openapi.yaml`, always run codegen before using hooks
- `lib/api-zod/src/index.ts` should only export from `./generated/api` — Orval sometimes regenerates it with an extra `./generated/types` line; remove it if it reappears
- The `zod/v4` subpath import doesn't bundle with esbuild — use `zod` directly in api-server routes
- In production the Express server serves the compiled frontend from `artifacts/gym-tracker/dist/public`; if that directory doesn't exist (e.g. after a fresh clone) run the frontend build before starting the server
- `PUT /plans/:id` replaces all exercises for the plan atomically — always send the full exercises array, not a partial update; the MCP `update_plan` tool follows the same contract
- `update_plan` cascades: existing plan_exercises are deleted and recreated, so plan_exercise_id references on session_exercises will be set to null (by the DB's `onDelete: "set null"` constraint) — historical session data is preserved
