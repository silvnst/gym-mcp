import { randomUUID } from "node:crypto";
import type { Express } from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  sessions,
  sessionExercises,
  sets,
  plans,
  planExercises,
} from "@workspace/db";
import { logger } from "../lib/logger.js";

// ── Transport session state ────────────────────────────────────────────────────

const transports = new Map<string, StreamableHTTPServerTransport>();
const sessionExpiry = new Map<string, number>();
const SESSION_TTL_MS = 30 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [id, exp] of sessionExpiry) {
    if (now > exp) {
      transports.delete(id);
      sessionExpiry.delete(id);
      logger.info({ sessionId: id }, "MCP session evicted (TTL expired)");
    }
  }
}, 60_000).unref();

// ── Helpers ────────────────────────────────────────────────────────────────────

function numOrNull(v: string | null | undefined): number | null {
  if (v == null) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

// ── Zod schemas for tool arguments ────────────────────────────────────────────

const getHistoryArgsSchema = z.object({
  limit: z.number().int().min(1).max(50).default(10),
  after: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  before: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const getSessionDetailArgsSchema = z.object({
  session_id: z.string().min(1),
});

const getVolumeByWeekArgsSchema = z.object({
  weeks: z.number().int().min(1).max(52).default(8),
});

const getExerciseHistoryArgsSchema = z.object({
  exercise_name: z.string().min(1),
});

const planExerciseInputSchema = z.object({
  name: z.string().min(1),
  target_sets: z.number().int().min(1),
  target_reps: z.number().int().min(1),
  target_weight_kg: z.number().min(0).nullable().optional(),
  notes: z.string().nullable().optional(),
});

const createPlanArgsSchema = z.object({
  name: z.string().min(1),
  notes: z.string().nullable().optional(),
  exercises: z.array(planExerciseInputSchema),
});

const updatePlanArgsSchema = z.object({
  plan_id: z.string().min(1),
  name: z.string().min(1),
  notes: z.string().nullable().optional(),
  exercises: z.array(planExerciseInputSchema),
});

const deletePlanArgsSchema = z.object({
  plan_id: z.string().min(1),
});

const logSessionSetSchema = z.object({
  reps: z.number().int().min(0).nullable().optional(),
  weight_kg: z.number().min(0).nullable().optional(),
});

const logSessionExerciseSchema = z.object({
  name: z.string().min(1),
  sets: z.array(logSessionSetSchema).min(1),
});

const logSessionArgsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  name: z.string().min(1),
  notes: z.string().nullable().optional(),
  exercises: z.array(logSessionExerciseSchema).min(1),
});

const deleteSessionArgsSchema = z.object({
  session_id: z.string().min(1),
});

// ── Raw SQL row types ──────────────────────────────────────────────────────────

type PrRow = { exercise: string; weight_kg: string; reps: number | null; date: string };
type VolumeRow = { week: Date | string; exercise: string; total_volume_kg: string };
type ExerciseHistoryRow = {
  session_id: string;
  date: string;
  session_name: string;
  set_number: number;
  reps: number | null;
  weight_kg: string | null;
  target_reps: number | null;
  target_weight_kg: string | null;
};
type OverdueRow = { exercise: string; last_date: string };
type VolumeTrendRow = { exercise: string; current_2w: string | null; previous_2w: string | null };

// ── MCP server (single shared instance) ───────────────────────────────────────

function createMcpServer(): Server {
  const server = new Server(
    { name: "gym-tracker", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      // ── Read tools ────────────────────────────────────────────────────────
      {
        name: "get_history",
        description:
          "Returns recent workout sessions with full detail (exercises and sets). Ordered by date descending. Optionally filter by date range.",
        annotations: { readOnlyHint: true },
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Number of sessions to return. Default 10, max 50.",
            },
            after: {
              type: "string",
              description: "Only return sessions on or after this date (YYYY-MM-DD).",
            },
            before: {
              type: "string",
              description: "Only return sessions on or before this date (YYYY-MM-DD).",
            },
          },
        },
      },
      {
        name: "get_session_detail",
        description: "Returns full detail of one specific session by ID.",
        annotations: { readOnlyHint: true },
        inputSchema: {
          type: "object",
          properties: {
            session_id: { type: "string", description: "The session ID" },
          },
          required: ["session_id"],
        },
      },
      {
        name: "get_plans",
        description: "Returns all workout plans with their exercises and targets.",
        annotations: { readOnlyHint: true },
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "get_prs",
        description:
          "Returns the personal record (heaviest weight) for every exercise ever logged, with reps and date. Ordered alphabetically. Excludes exercises logged without weight (e.g. bodyweight pull-ups).",
        annotations: { readOnlyHint: true },
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "get_volume_by_week",
        description:
          "Returns total training volume (kg lifted = reps × weight_kg) aggregated by ISO week per exercise. Sets logged without both reps and weight are excluded from the total.",
        annotations: { readOnlyHint: true },
        inputSchema: {
          type: "object",
          properties: {
            weeks: {
              type: "number",
              description: "Number of recent weeks to include. Default 8, max 52.",
            },
          },
        },
      },
      {
        name: "get_exercise_history",
        description:
          "Returns all sessions for a specific exercise grouped by date (newest first), with each set's reps, weight, and whether it hit the plan target. Use to trace strength progression over time.",
        annotations: { readOnlyHint: true },
        inputSchema: {
          type: "object",
          properties: {
            exercise_name: {
              type: "string",
              description: "Exercise name to look up. Case-insensitive, partial match supported.",
            },
          },
          required: ["exercise_name"],
        },
      },
      {
        name: "get_training_context",
        description:
          "Returns a full training snapshot in one call: last 3 sessions with exercises and sets, all personal records, exercises overdue for 14+ days (from plans), and per-exercise volume trend (last 2 weeks vs prior 2 weeks). Use this as the first call when the user wants training insights or recommendations.",
        annotations: { readOnlyHint: true },
        inputSchema: { type: "object", properties: {} },
      },
      // ── Write tools ───────────────────────────────────────────────────────
      {
        name: "create_plan",
        description: "Creates a new workout plan with exercises atomically.",
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Plan name, e.g. 'PPL Push A'." },
            notes: { type: "string", description: "Optional notes for the plan." },
            exercises: {
              type: "array",
              description: "Ordered list of exercises for the plan.",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Exercise name." },
                  target_sets: { type: "number", description: "Number of sets." },
                  target_reps: { type: "number", description: "Target reps per set." },
                  target_weight_kg: { type: "number", description: "Target weight in kg (optional)." },
                  notes: { type: "string", description: "Optional exercise notes." },
                },
                required: ["name", "target_sets", "target_reps"],
              },
            },
          },
          required: ["name", "exercises"],
        },
      },
      {
        name: "update_plan",
        description:
          "Replaces all exercises for an existing plan atomically. Always send the full exercise list — partial updates are not supported.",
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
        inputSchema: {
          type: "object",
          properties: {
            plan_id: { type: "string", description: "The plan ID to update." },
            name: { type: "string", description: "New plan name." },
            notes: { type: "string", description: "Optional notes for the plan." },
            exercises: {
              type: "array",
              description: "Full replacement list of exercises.",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  target_sets: { type: "number" },
                  target_reps: { type: "number" },
                  target_weight_kg: { type: "number" },
                  notes: { type: "string" },
                },
                required: ["name", "target_sets", "target_reps"],
              },
            },
          },
          required: ["plan_id", "name", "exercises"],
        },
      },
      {
        name: "delete_plan",
        description:
          "Permanently deletes a workout plan and its exercises. Sessions that used the plan keep their recorded data.",
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
        inputSchema: {
          type: "object",
          properties: {
            plan_id: { type: "string", description: "The plan ID to delete." },
          },
          required: ["plan_id"],
        },
      },
      {
        name: "log_session",
        description:
          "Logs a complete workout session atomically (session + exercises + sets in one call).",
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
        inputSchema: {
          type: "object",
          properties: {
            date: {
              type: "string",
              description: "Session date in YYYY-MM-DD format.",
            },
            name: {
              type: "string",
              description: "Session name, e.g. 'Gemini A'.",
            },
            notes: {
              type: "string",
              description: "Optional free-text notes for the session.",
            },
            exercises: {
              type: "array",
              description: "Ordered list of exercises performed.",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Exercise name, e.g. 'Back Squat'." },
                  sets: {
                    type: "array",
                    description: "Sets performed for this exercise.",
                    items: {
                      type: "object",
                      properties: {
                        reps: { type: "number", description: "Reps performed (integer)." },
                        weight_kg: { type: "number", description: "Weight in kg." },
                      },
                    },
                  },
                },
                required: ["name", "sets"],
              },
            },
          },
          required: ["date", "name", "exercises"],
        },
      },
      {
        name: "delete_session",
        description:
          "Permanently deletes a session and all its exercises and sets. This cannot be undone.",
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
        inputSchema: {
          type: "object",
          properties: {
            session_id: { type: "string", description: "The session ID to delete." },
          },
          required: ["session_id"],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        // ── Read handlers ────────────────────────────────────────────────────

        case "get_history": {
          const parsed = getHistoryArgsSchema.safeParse(args ?? {});
          if (!parsed.success) {
            return {
              content: [{ type: "text", text: `Error: invalid arguments — ${parsed.error.message}` }],
              isError: true,
            };
          }

          const { limit, after, before } = parsed.data;
          const conditions = [
            after ? gte(sessions.date, after) : undefined,
            before ? lte(sessions.date, before) : undefined,
          ].filter(Boolean);

          const recentSessions = await db.query.sessions.findMany({
            orderBy: [desc(sessions.date)],
            limit,
            where: conditions.length > 0 ? and(...(conditions as Parameters<typeof and>)) : undefined,
            with: {
              sessionExercises: {
                orderBy: (se, { asc }) => [asc(se.sortOrder)],
                with: { sets: { orderBy: (s, { asc }) => [asc(s.setNumber)] } },
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
            structuredContent: { data: result },
          };
        }

        case "get_session_detail": {
          const parsed = getSessionDetailArgsSchema.safeParse(args ?? {});
          if (!parsed.success) {
            return {
              content: [{ type: "text", text: `Error: invalid arguments — ${parsed.error.message}` }],
              isError: true,
            };
          }

          const session = await db.query.sessions.findFirst({
            where: eq(sessions.id, parsed.data.session_id),
            with: {
              sessionExercises: {
                orderBy: (se, { asc }) => [asc(se.sortOrder)],
                with: { sets: { orderBy: (s, { asc }) => [asc(s.setNumber)] } },
              },
            },
          });

          if (!session) {
            return {
              content: [{ type: "text", text: `Error: Session "${parsed.data.session_id}" not found` }],
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
            structuredContent: result,
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
            structuredContent: { data: result },
          };
        }

        case "get_prs": {
          const rows = await db.execute<PrRow>(sql`
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

          const result = rows.rows.map((r) => ({
            exercise: r.exercise,
            weight_kg: parseFloat(r.weight_kg),
            reps: r.reps,
            date: r.date,
          }));

          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            structuredContent: { data: result },
          };
        }

        case "get_volume_by_week": {
          const parsed = getVolumeByWeekArgsSchema.safeParse(args ?? {});
          if (!parsed.success) {
            return {
              content: [{ type: "text", text: `Error: invalid arguments — ${parsed.error.message}` }],
              isError: true,
            };
          }

          const rows = await db.execute<VolumeRow>(sql`
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
              AND sess.date >= (CURRENT_DATE - (${parsed.data.weeks} * INTERVAL '1 week'))
            GROUP BY 1, 2
            ORDER BY 1 ASC, 2 ASC
          `);

          const result = rows.rows.map((r) => ({
            week: r.week instanceof Date ? r.week.toISOString().split("T")[0] : r.week,
            exercise: r.exercise,
            total_volume_kg: parseFloat(r.total_volume_kg),
          }));

          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            structuredContent: { data: result },
          };
        }

        case "get_exercise_history": {
          const parsed = getExerciseHistoryArgsSchema.safeParse(args ?? {});
          if (!parsed.success) {
            return {
              content: [{ type: "text", text: `Error: invalid arguments — ${parsed.error.message}` }],
              isError: true,
            };
          }

          const { exercise_name } = parsed.data;

          const rows = await db.execute<ExerciseHistoryRow>(sql`
            SELECT
              sess.id AS session_id,
              sess.date,
              sess.name AS session_name,
              s.set_number,
              s.reps,
              s.weight_kg,
              se.target_reps,
              se.target_weight_kg
            FROM ${sets} s
            JOIN ${sessionExercises} se ON s.session_exercise_id = se.id
            JOIN ${sessions} sess ON se.session_id = sess.id
            WHERE se.name ILIKE ${"%" + exercise_name + "%"}
            ORDER BY sess.date DESC, s.set_number ASC
          `);

          // Group flat rows into sessions
          const sessionMap = new Map<string, {
            date: string;
            session_name: string;
            sets: { reps: number | null; weight_kg: number | null; hit_target: boolean | null }[];
          }>();

          for (const r of rows.rows) {
            if (!sessionMap.has(r.session_id)) {
              sessionMap.set(r.session_id, { date: r.date, session_name: r.session_name, sets: [] });
            }
            const weightKg = r.weight_kg != null ? parseFloat(r.weight_kg) : null;
            const targetReps = r.target_reps;
            const targetWeightKg = r.target_weight_kg != null ? parseFloat(r.target_weight_kg) : null;
            let hitTarget: boolean | null = null;
            if (targetReps != null && r.reps != null) {
              hitTarget = r.reps >= targetReps && (targetWeightKg == null || (weightKg != null && weightKg >= targetWeightKg));
            }
            sessionMap.get(r.session_id)!.sets.push({ reps: r.reps, weight_kg: weightKg, hit_target: hitTarget });
          }

          const sessionsArr = Array.from(sessionMap.values());
          const result = {
            exercise: exercise_name,
            total_sessions: sessionsArr.length,
            sessions: sessionsArr,
          };

          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            structuredContent: result,
          };
        }

        case "get_training_context": {
          const [recentSessions, prRows, overdueRows, trendRows] = await Promise.all([
            db.query.sessions.findMany({
              orderBy: [desc(sessions.date)],
              limit: 3,
              with: {
                sessionExercises: {
                  orderBy: (se, { asc }) => [asc(se.sortOrder)],
                  with: { sets: { orderBy: (s, { asc }) => [asc(s.setNumber)] } },
                },
              },
            }),
            db.execute<PrRow>(sql`
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
            `),
            db.execute<OverdueRow>(sql`
              SELECT
                pe.name AS exercise,
                MAX(sess.date) AS last_date
              FROM ${planExercises} pe
              LEFT JOIN ${sessionExercises} se ON se.name ILIKE pe.name
              LEFT JOIN ${sessions} sess ON se.session_id = sess.id
              GROUP BY pe.name
              HAVING MAX(sess.date) IS NULL OR MAX(sess.date) < CURRENT_DATE - INTERVAL '14 days'
            `),
            db.execute<VolumeTrendRow>(sql`
              SELECT
                se.name AS exercise,
                SUM(s.reps * s.weight_kg) FILTER (WHERE sess.date >= CURRENT_DATE - INTERVAL '14 days')::float AS current_2w,
                SUM(s.reps * s.weight_kg) FILTER (WHERE sess.date >= CURRENT_DATE - INTERVAL '28 days' AND sess.date < CURRENT_DATE - INTERVAL '14 days')::float AS previous_2w
              FROM ${sets} s
              JOIN ${sessionExercises} se ON s.session_exercise_id = se.id
              JOIN ${sessions} sess ON se.session_id = sess.id
              WHERE s.reps IS NOT NULL AND s.weight_kg IS NOT NULL
                AND sess.date >= CURRENT_DATE - INTERVAL '28 days'
              GROUP BY se.name
              ORDER BY se.name ASC
            `),
          ]);

          const result = {
            recent_sessions: recentSessions.map((session) => ({
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
            })),
            personal_records: prRows.rows.map((r) => ({
              exercise: r.exercise,
              weight_kg: parseFloat(r.weight_kg),
              reps: r.reps,
              date: r.date,
            })),
            overdue_exercises: overdueRows.rows.map((r) => ({
              name: r.exercise,
              days_since_last_session: r.last_date
                ? Math.floor((Date.now() - new Date(r.last_date).getTime()) / 86_400_000)
                : null,
            })),
            volume_trend: trendRows.rows.map((r) => ({
              exercise: r.exercise,
              current_2w_volume: r.current_2w != null ? parseFloat(r.current_2w) : 0,
              previous_2w_volume: r.previous_2w != null ? parseFloat(r.previous_2w) : 0,
            })),
          };

          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            structuredContent: result,
          };
        }

        // ── Write handlers ───────────────────────────────────────────────────

        case "create_plan": {
          const parsed = createPlanArgsSchema.safeParse(args ?? {});
          if (!parsed.success) {
            return {
              content: [{ type: "text", text: `Error: invalid arguments — ${parsed.error.message}` }],
              isError: true,
            };
          }

          const { name, notes, exercises } = parsed.data;

          const planId = await db.transaction(async (tx) => {
            const [plan] = await tx
              .insert(plans)
              .values({ name, notes: notes ?? null })
              .returning({ id: plans.id });

            if (exercises.length > 0) {
              await tx.insert(planExercises).values(
                exercises.map((ex, i) => ({
                  planId: plan.id,
                  name: ex.name,
                  sortOrder: i,
                  targetSets: ex.target_sets,
                  targetReps: ex.target_reps,
                  targetWeightKg: ex.target_weight_kg != null ? ex.target_weight_kg.toString() : null,
                  notes: ex.notes ?? null,
                })),
              );
            }

            return plan.id;
          });

          const result = { success: true, plan_id: planId };
          return {
            content: [{ type: "text", text: JSON.stringify(result) }],
            structuredContent: result,
          };
        }

        case "update_plan": {
          const parsed = updatePlanArgsSchema.safeParse(args ?? {});
          if (!parsed.success) {
            return {
              content: [{ type: "text", text: `Error: invalid arguments — ${parsed.error.message}` }],
              isError: true,
            };
          }

          const { plan_id, name, notes, exercises } = parsed.data;

          const updated = await db.transaction(async (tx) => {
            const existing = await tx.query.plans.findFirst({ where: eq(plans.id, plan_id) });
            if (!existing) return false;

            await tx.update(plans).set({ name, notes: notes ?? null }).where(eq(plans.id, plan_id));
            await tx.delete(planExercises).where(eq(planExercises.planId, plan_id));

            if (exercises.length > 0) {
              await tx.insert(planExercises).values(
                exercises.map((ex, i) => ({
                  planId: plan_id,
                  name: ex.name,
                  sortOrder: i,
                  targetSets: ex.target_sets,
                  targetReps: ex.target_reps,
                  targetWeightKg: ex.target_weight_kg != null ? ex.target_weight_kg.toString() : null,
                  notes: ex.notes ?? null,
                })),
              );
            }

            return true;
          });

          if (!updated) {
            return {
              content: [{ type: "text", text: `Error: Plan "${plan_id}" not found` }],
              isError: true,
            };
          }

          const result = { success: true };
          return {
            content: [{ type: "text", text: JSON.stringify(result) }],
            structuredContent: result,
          };
        }

        case "delete_plan": {
          const parsed = deletePlanArgsSchema.safeParse(args ?? {});
          if (!parsed.success) {
            return {
              content: [{ type: "text", text: `Error: invalid arguments — ${parsed.error.message}` }],
              isError: true,
            };
          }

          const existing = await db.query.plans.findFirst({ where: eq(plans.id, parsed.data.plan_id) });
          if (!existing) {
            return {
              content: [{ type: "text", text: `Error: Plan "${parsed.data.plan_id}" not found` }],
              isError: true,
            };
          }

          await db.delete(plans).where(eq(plans.id, parsed.data.plan_id));

          const result = { success: true };
          return {
            content: [{ type: "text", text: JSON.stringify(result) }],
            structuredContent: result,
          };
        }

        case "log_session": {
          const parsed = logSessionArgsSchema.safeParse(args ?? {});
          if (!parsed.success) {
            return {
              content: [{ type: "text", text: `Error: invalid arguments — ${parsed.error.message}` }],
              isError: true,
            };
          }

          const { date, name, notes, exercises } = parsed.data;

          const sessionId = await db.transaction(async (tx) => {
            const [session] = await tx
              .insert(sessions)
              .values({ date, name, notes: notes ?? null })
              .returning({ id: sessions.id });

            for (let i = 0; i < exercises.length; i++) {
              const ex = exercises[i]!;
              const [se] = await tx
                .insert(sessionExercises)
                .values({
                  sessionId: session.id,
                  name: ex.name,
                  sortOrder: i,
                })
                .returning({ id: sessionExercises.id });

              if (ex.sets.length > 0) {
                await tx.insert(sets).values(
                  ex.sets.map((s, si) => ({
                    sessionExerciseId: se.id,
                    setNumber: si + 1,
                    reps: s.reps ?? null,
                    weightKg: s.weight_kg != null ? s.weight_kg.toString() : null,
                  })),
                );
              }
            }

            return session.id;
          });

          const result = { success: true, session_id: sessionId };
          return {
            content: [{ type: "text", text: JSON.stringify(result) }],
            structuredContent: result,
          };
        }

        case "delete_session": {
          const parsed = deleteSessionArgsSchema.safeParse(args ?? {});
          if (!parsed.success) {
            return {
              content: [{ type: "text", text: `Error: invalid arguments — ${parsed.error.message}` }],
              isError: true,
            };
          }

          const existing = await db.query.sessions.findFirst({
            where: eq(sessions.id, parsed.data.session_id),
          });

          if (!existing) {
            return {
              content: [{ type: "text", text: `Error: Session "${parsed.data.session_id}" not found` }],
              isError: true,
            };
          }

          await db.delete(sessions).where(eq(sessions.id, parsed.data.session_id));

          const result = { success: true };
          return {
            content: [{ type: "text", text: JSON.stringify(result) }],
            structuredContent: result,
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

// ── Route setup ────────────────────────────────────────────────────────────────

export function setupMcpRoutes(app: Express): void {
  // Single endpoint handles POST (new session or message), GET (SSE stream), DELETE (close session)
  app.all("/mcp", async (req, res) => {
    try {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;

      if (sessionId) {
        const transport = transports.get(sessionId);
        if (!transport) {
          res.status(404).json({ error: "MCP session not found or expired" });
          return;
        }
        await transport.handleRequest(req, res, req.body);
        return;
      }

      // No session ID → new session, only POST is valid for initialization
      if (req.method !== "POST") {
        res.status(400).json({ error: "Send POST to /mcp to start a new session" });
        return;
      }

      const newSessionId = randomUUID();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => newSessionId,
      });

      transport.onclose = () => {
        transports.delete(newSessionId);
        sessionExpiry.delete(newSessionId);
        logger.info({ sessionId: newSessionId }, "MCP session closed");
      };

      transports.set(newSessionId, transport);
      sessionExpiry.set(newSessionId, Date.now() + SESSION_TTL_MS);
      logger.info({ sessionId: newSessionId }, "MCP session opened");

      // A fresh Server instance is required per connection — the MCP SDK
      // forbids connecting a single Server to more than one transport.
      const mcpServer = createMcpServer();
      await mcpServer.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      logger.error({ err }, "MCP request error");
      if (!res.headersSent) {
        res.status(500).json({ error: "MCP error" });
      }
    }
  });
}
