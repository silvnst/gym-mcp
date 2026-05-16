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
- MCP: @modelcontextprotocol/sdk (HTTP + SSE transport)
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

- MCP server uses HTTP+SSE transport at `GET /sse` + `POST /messages` (required by Claude.ai remote connectors)
- MCP endpoints are separate from `/api/*` REST routes — no base path prefix, auth via Bearer token only
- Sessions can be created from a plan (exercises pre-populated) or ad-hoc
- Cascade deletes: plan → plan_exercises; session → session_exercises → sets
- `lib/api-zod/src/index.ts` only re-exports `./generated/api` (not `./generated/types`) to avoid name collisions with orval-generated Zod schemas

## Product

- **Plans**: Create reusable workout templates with exercises and target sets/reps/weight
- **Sessions**: Execute a session from a plan or ad-hoc; log actual reps/weight per set
- **History**: Browse past sessions with full exercise/set detail
- **MCP for Claude.ai**: Connect at `https://<host>/sse` with `Authorization: Bearer <MCP_API_KEY>` header — 5 read-only tools: `get_history`, `get_session_detail`, `get_plans`, `get_prs`, `get_volume_by_week`

## Connecting Claude.ai

1. Claude.ai → Settings → Connectors → Add custom connector
2. SSE URL: `https://<deployed-host>/sse`
3. Header: `Authorization: Bearer <MCP_API_KEY>`
4. Claude discovers all tools automatically

## Gotchas

- After changing `lib/api-spec/openapi.yaml`, always run codegen before using hooks
- `lib/api-zod/src/index.ts` should only export from `./generated/api` — orval sometimes regenerates it with an extra `./generated/types` line that causes type conflicts; remove it if it reappears
- The `zod/v4` subpath import doesn't bundle with esbuild — use `zod` directly in api-server routes
- MCP_API_KEY is a secret (not an env var) — set in Replit Secrets
