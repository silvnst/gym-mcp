import type { Express } from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { desc, eq, sql } from "drizzle-orm";
import { db, sessions, sessionExercises, sets, plans, planExercises } from "@workspace/db";
import { mcpAuth } from "../middlewares/mcpAuth.js";
import { logger } from "../lib/logger.js";

const transports = new Map<string, SSEServerTransport>();

function numOrNull(v: string | null | undefined): number | null {
  if (v == null) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function createMcpServer(): Server {
  const server = new Server(
    { name: "gym-tracker", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "get_history",
        description:
          "Returns recent workout sessions with full detail (exercises and sets). Ordered by date descending.",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Number of sessions to return. Default 10, max 50.",
            },
          },
        },
      },
      {
        name: "get_session_detail",
        description: "Returns full detail of one specific session by ID.",
        inputSchema: {
          type: "object",
          properties: {
            session_id: {
              type: "string",
              description: "The session ID",
            },
          },
          required: ["session_id"],
        },
      },
      {
        name: "get_plans",
        description:
          "Returns all workout plans with their exercises and targets.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_prs",
        description:
          "Returns the personal record (heaviest weight) for every exercise ever logged, with reps and date. Ordered alphabetically.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_volume_by_week",
        description:
          "Returns total training volume (kg lifted = reps × weight_kg) aggregated by ISO week per exercise.",
        inputSchema: {
          type: "object",
          properties: {
            weeks: {
              type: "number",
              description: "Number of recent weeks to include. Default 8.",
            },
          },
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "get_history": {
          const limit = Math.min(
            Math.max(1, Number((args as any)?.limit ?? 10)),
            50,
          );

          const recentSessions = await db.query.sessions.findMany({
            orderBy: [desc(sessions.date)],
            limit,
            with: {
              sessionExercises: {
                orderBy: (se, { asc }) => [asc(se.sortOrder)],
                with: {
                  sets: { orderBy: (s, { asc }) => [asc(s.setNumber)] },
                },
              },
            },
          });

          const result = recentSessions.map((session) => ({
            id: session.id,
            date: session.date,
            name: session.name,
            notes: session.notes,
            exercises: session.sessionExercises.map((se) => ({
              name: se.name,
              targetSets: se.targetSets,
              targetReps: se.targetReps,
              targetWeightKg: numOrNull(se.targetWeightKg),
              sets: se.sets.map((s) => ({
                setNumber: s.setNumber,
                reps: s.reps,
                weightKg: numOrNull(s.weightKg),
              })),
            })),
          }));

          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        }

        case "get_session_detail": {
          const sessionId = (args as any)?.session_id;
          if (!sessionId || typeof sessionId !== "string") {
            return {
              content: [{ type: "text", text: "Error: session_id is required" }],
              isError: true,
            };
          }

          const session = await db.query.sessions.findFirst({
            where: eq(sessions.id, sessionId),
            with: {
              sessionExercises: {
                orderBy: (se, { asc }) => [asc(se.sortOrder)],
                with: {
                  sets: { orderBy: (s, { asc }) => [asc(s.setNumber)] },
                },
              },
            },
          });

          if (!session) {
            return {
              content: [
                {
                  type: "text",
                  text: `Error: Session with ID "${sessionId}" not found`,
                },
              ],
              isError: true,
            };
          }

          const result = {
            id: session.id,
            date: session.date,
            name: session.name,
            notes: session.notes,
            exercises: session.sessionExercises.map((se) => ({
              name: se.name,
              targetSets: se.targetSets,
              targetReps: se.targetReps,
              targetWeightKg: numOrNull(se.targetWeightKg),
              sets: se.sets.map((s) => ({
                setNumber: s.setNumber,
                reps: s.reps,
                weightKg: numOrNull(s.weightKg),
              })),
            })),
          };

          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        }

        case "get_plans": {
          const allPlans = await db.query.plans.findMany({
            orderBy: (p, { asc }) => [asc(p.name)],
            with: {
              planExercises: { orderBy: (pe, { asc }) => [asc(pe.sortOrder)] },
            },
          });

          const result = allPlans.map((plan) => ({
            id: plan.id,
            name: plan.name,
            notes: plan.notes,
            exercises: plan.planExercises.map((pe) => ({
              name: pe.name,
              sortOrder: pe.sortOrder,
              targetSets: pe.targetSets,
              targetReps: pe.targetReps,
              targetWeightKg: numOrNull(pe.targetWeightKg),
              notes: pe.notes,
            })),
          }));

          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        }

        case "get_prs": {
          const rows = await db.execute(sql`
            SELECT DISTINCT ON (se.name)
              se.name AS exercise,
              s.weight_kg::float AS weight_kg,
              s.reps,
              sess.date
            FROM ${sets} s
            JOIN ${sessionExercises} se ON s.session_exercise_id = se.id
            JOIN ${sessions} sess ON se.session_id = sess.id
            WHERE s.weight_kg IS NOT NULL
            ORDER BY se.name ASC, s.weight_kg DESC
          `);

          const result = rows.rows.map((r: any) => ({
            exercise: r.exercise,
            weight_kg: parseFloat(r.weight_kg),
            reps: r.reps,
            date: r.date,
          }));

          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        }

        case "get_volume_by_week": {
          const weeks = Math.min(Math.max(1, Number((args as any)?.weeks ?? 8)), 52);

          const rows = await db.execute(sql`
            SELECT
              date_trunc('week', sess.date::timestamp)::date AS week,
              se.name AS exercise,
              SUM(s.reps * s.weight_kg)::float AS total_volume_kg
            FROM ${sets} s
            JOIN ${sessionExercises} se ON s.session_exercise_id = se.id
            JOIN ${sessions} sess ON se.session_id = sess.id
            WHERE
              s.reps IS NOT NULL
              AND s.weight_kg IS NOT NULL
              AND sess.date >= (CURRENT_DATE - (${weeks} * INTERVAL '1 week'))
            GROUP BY 1, 2
            ORDER BY 1 ASC, 2 ASC
          `);

          const result = rows.rows.map((r: any) => ({
            week: r.week instanceof Date ? r.week.toISOString().split("T")[0] : r.week,
            exercise: r.exercise,
            total_volume_kg: parseFloat(r.total_volume_kg),
          }));

          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        }

        default:
          return {
            content: [{ type: "text", text: `Error: Unknown tool "${name}"` }],
            isError: true,
          };
      }
    } catch (err) {
      logger.error({ err, tool: name }, "MCP tool error");
      return {
        content: [
          {
            type: "text",
            text: `Error: ${err instanceof Error ? err.message : "An unexpected error occurred"}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

export function setupMcpRoutes(app: Express): void {
  app.get("/sse", mcpAuth, async (req, res) => {
    try {
      const transport = new SSEServerTransport("/messages", res);
      transports.set(transport.sessionId, transport);

      res.on("close", () => {
        transports.delete(transport.sessionId);
        logger.info({ sessionId: transport.sessionId }, "MCP SSE connection closed");
      });

      logger.info({ sessionId: transport.sessionId }, "MCP SSE connection opened");

      const server = createMcpServer();
      await server.connect(transport);
    } catch (err) {
      logger.error({ err }, "MCP SSE connection error");
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to establish MCP connection" });
      }
    }
  });

  app.post("/messages", mcpAuth, async (req, res) => {
    const sessionId = req.query["sessionId"] as string;
    const transport = transports.get(sessionId);

    if (!transport) {
      res.status(404).json({ error: "No active MCP session with that ID" });
      return;
    }

    try {
      await transport.handlePostMessage(req, res, req.body);
    } catch (err) {
      logger.error({ err, sessionId }, "MCP message handling error");
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to handle MCP message" });
      }
    }
  });
}
