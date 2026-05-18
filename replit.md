# Gym Tracker

A personal gym tracking app with workout plan management, session execution, history, and a read-only MCP server for Claude.ai analysis.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required secret: `MCP_API_KEY` — Bearer token for Claude.ai MCP authentication

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (5 tables: plans, plan_exercises, sessions, session_exercises, sets)
- Validation: Zod
- MCP: @modelcontextprotocol/sdk (Streamable HTTP transport, spec 2025-03-26)
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (ESM bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all REST API contracts
- `lib/db/src/schema/index.ts` — Drizzle ORM schema (all 5 tables + relations)
- `artifacts/api-server/src/routes/` — REST route handlers (plans, sessions, sets, health)
- `artifacts/api-server/src/mcp/server.ts` — MCP server with all 5 tools
- `artifacts/api-server/src/middlewares/mcpAuth.ts` — Bearer token auth for MCP
- `lib/api-client-react/src/generated/` — generated React Query hooks (do not edit)
- `lib/api-zod/src/generated/` — generated Zod schemas (do not edit)

## Architecture decisions

- MCP server uses Streamable HTTP transport (MCP spec 2025-03-26) at `POST /mcp` — compatible with Claude.ai remote custom connectors
- MCP endpoints are separate from `/api/*` REST routes — no base path prefix, auth via Bearer token only
- Sessions can be created from a plan (exercises pre-populated) or ad-hoc
- Cascade deletes: plan → plan_exercises; session → session_exercises → sets
- `lib/api-zod/src/index.ts` only re-exports `./generated/api` (not `./generated/types`) to avoid name collisions with orval-generated Zod schemas

## Product

- **Plans**: Create reusable workout templates with exercises and target sets/reps/weight
- **Sessions**: Execute a session from a plan or ad-hoc; log actual reps/weight per set
- **History**: Browse past sessions with full exercise/set detail
- **MCP for Claude.ai**: Connect at `https://<host>/mcp` with `Authorization: Bearer <MCP_API_KEY>` header — 7 tools (5 read, 2 write)

## MCP Tools

### Read tools

| Tool | Input | Description |
|---|---|---|
| `get_history` | `limit` (default 10, max 50) | Recent sessions with full exercises + sets, newest first |
| `get_session_detail` | `session_id` | Full detail of one session |
| `get_plans` | — | All workout plans with exercises and targets |
| `get_prs` | — | Personal record (heaviest set) per exercise, alphabetically |
| `get_volume_by_week` | `weeks` (default 8, max 52) | Total volume (reps × kg) per exercise per ISO week |

### Write tools

| Tool | Input | Description |
|---|---|---|
| `log_session` | `date`, `name`, `exercises[]` (+ optional `notes`) | Creates a session with all exercises and sets in one atomic call |
| `delete_session` | `session_id` | Permanently deletes a session and all its exercises/sets |

**`log_session` input shape:**
```json
{
  "date": "2026-05-18",
  "name": "Gemini A",
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
2. Set the **URL** to: `https://<deployed-host>/mcp`
3. Add a custom **header**: `Authorization: Bearer <MCP_API_KEY>`
4. Save — Claude discovers all 7 tools automatically

After connecting you can talk to Claude naturally:

- _"Log today's session: Gemini A — back squat 3×5 at 102.5kg, RDL 3×8 at 80kg"_
- _"What are my current PRs?"_
- _"How has my squat volume changed over the last 6 weeks?"_
- _"Delete yesterday's session"_
- _"Compare my planned vs actual performance in the last 3 sessions"_

## Gotchas

- After changing `lib/api-spec/openapi.yaml`, always run codegen before using hooks
- `lib/api-zod/src/index.ts` should only export from `./generated/api` — orval sometimes regenerates it with an extra `./generated/types` line that causes type conflicts; remove it if it reappears
- The `zod/v4` subpath import doesn't bundle with esbuild — use `zod` directly in api-server routes
- MCP_API_KEY is a secret (not an env var) — set in Replit Secrets
