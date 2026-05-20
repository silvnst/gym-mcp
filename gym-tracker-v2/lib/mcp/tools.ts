import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db, sessions, sessionExercises, sets, plans, planExercises } from '@/lib/db'

function numOrNull(v: string | null | undefined): number | null {
  if (v == null) return null
  const n = parseFloat(v)
  return isNaN(n) ? null : n
}

type PrRow = { exercise: string; weight_kg: string; reps: number | null; date: string }
type VolumeRow = { week: Date | string; exercise: string; total_volume_kg: string }
type ExerciseHistoryRow = {
  session_id: string
  date: string
  session_name: string
  set_number: number
  reps: number | null
  weight_kg: string | null
  target_reps: number | null
  target_weight_kg: string | null
}
type OverdueRow = { exercise: string; last_date: string }
type VolumeTrendRow = { exercise: string; current_2w: string | null; previous_2w: string | null }

export function createMcpServer(userId: string): McpServer {
  const server = new McpServer({ name: 'gym-tracker', version: '1.0.0' })

  server.tool(
    'get_history',
    'Returns recent workout sessions with full detail (exercises and sets). Ordered by date descending. Optionally filter by date range.',
    {
      limit: z.number().int().min(1).max(50).default(10).optional(),
      after: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      before: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    },
    async (args) => {
      const limit = args.limit ?? 10
      const { after, before } = args
      const conditions = [
        eq(sessions.userId, userId),
        after ? gte(sessions.date, after) : undefined,
        before ? lte(sessions.date, before) : undefined,
      ].filter(Boolean) as Parameters<typeof and>

      const recentSessions = await db.query.sessions.findMany({
        orderBy: [desc(sessions.date)],
        limit,
        where: and(...conditions),
        with: {
          sessionExercises: {
            orderBy: (se, { asc }) => [asc(se.sortOrder)],
            with: { sets: { orderBy: (s, { asc }) => [asc(s.setNumber)] } },
          },
        },
      })

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
      }))

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    }
  )

  server.tool(
    'get_session_detail',
    'Returns full detail of one specific session by ID.',
    { session_id: z.string().min(1) },
    async ({ session_id }) => {
      const session = await db.query.sessions.findFirst({
        where: and(eq(sessions.id, session_id), eq(sessions.userId, userId)),
        with: {
          sessionExercises: {
            orderBy: (se, { asc }) => [asc(se.sortOrder)],
            with: { sets: { orderBy: (s, { asc }) => [asc(s.setNumber)] } },
          },
        },
      })

      if (!session) {
        return {
          content: [{ type: 'text', text: `Error: Session "${session_id}" not found` }],
          isError: true,
        }
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
      }

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    }
  )

  server.tool(
    'get_plans',
    'Returns all workout plans with their exercises and targets.',
    {},
    async () => {
      const allPlans = await db.query.plans.findMany({
        where: eq(plans.userId, userId),
        orderBy: (p, { asc }) => [asc(p.name)],
        with: {
          planExercises: { orderBy: (pe, { asc }) => [asc(pe.sortOrder)] },
        },
      })

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
      }))

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    }
  )

  server.tool(
    'get_prs',
    'Returns the personal record (heaviest weight) for every exercise ever logged, with reps and date.',
    {},
    async () => {
      const rows = await db.execute<PrRow>(sql`
        SELECT DISTINCT ON (se.name)
          se.name AS exercise,
          s.weight_kg::float AS weight_kg,
          s.reps,
          sess.date
        FROM ${sets} s
        JOIN ${sessionExercises} se ON s.session_exercise_id = se.id
        JOIN ${sessions} sess ON se.session_id = sess.id
        WHERE s.weight_kg IS NOT NULL AND sess.user_id = ${userId}
        ORDER BY se.name ASC, s.weight_kg DESC
      `)

      const result = (rows as PrRow[]).map((r) => ({
        exercise: r.exercise,
        weight_kg: parseFloat(r.weight_kg),
        reps: r.reps,
        date: r.date,
      }))

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    }
  )

  server.tool(
    'get_volume_by_week',
    'Returns total training volume (kg lifted = reps × weight_kg) aggregated by ISO week per exercise.',
    { weeks: z.number().int().min(1).max(52).default(8).optional() },
    async (args) => {
      const weeks = args.weeks ?? 8

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
          AND sess.date >= (CURRENT_DATE - (${weeks} * INTERVAL '1 week'))
          AND sess.user_id = ${userId}
        GROUP BY 1, 2
        ORDER BY 1 ASC, 2 ASC
      `)

      const result = (rows as VolumeRow[]).map((r) => ({
        week: r.week instanceof Date ? r.week.toISOString().split('T')[0] : r.week,
        exercise: r.exercise,
        total_volume_kg: parseFloat(r.total_volume_kg),
      }))

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    }
  )

  server.tool(
    'get_exercise_history',
    'Returns all sessions for a specific exercise grouped by date (newest first), with each set\'s reps, weight, and whether it hit the plan target.',
    { exercise_name: z.string().min(1) },
    async ({ exercise_name }) => {
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
        WHERE se.name ILIKE ${'%' + exercise_name + '%'}
          AND sess.user_id = ${userId}
        ORDER BY sess.date DESC, s.set_number ASC
      `)

      const sessionMap = new Map<
        string,
        {
          date: string
          session_name: string
          sets: { reps: number | null; weight_kg: number | null; hit_target: boolean | null }[]
        }
      >()

      for (const r of (rows as ExerciseHistoryRow[])) {
        if (!sessionMap.has(r.session_id)) {
          sessionMap.set(r.session_id, { date: r.date, session_name: r.session_name, sets: [] })
        }
        const weightKg = r.weight_kg != null ? parseFloat(r.weight_kg) : null
        const targetReps = r.target_reps
        const targetWeightKg =
          r.target_weight_kg != null ? parseFloat(r.target_weight_kg) : null
        let hitTarget: boolean | null = null
        if (targetReps != null && r.reps != null) {
          hitTarget =
            r.reps >= targetReps &&
            (targetWeightKg == null || (weightKg != null && weightKg >= targetWeightKg))
        }
        sessionMap
          .get(r.session_id)!
          .sets.push({ reps: r.reps, weight_kg: weightKg, hit_target: hitTarget })
      }

      const sessionsArr = Array.from(sessionMap.values())
      const result = {
        exercise: exercise_name,
        total_sessions: sessionsArr.length,
        sessions: sessionsArr,
      }

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    }
  )

  server.tool(
    'get_training_context',
    'Returns a full training snapshot in one call: last 3 sessions with exercises and sets, all personal records, exercises overdue for 14+ days (from plans), and per-exercise volume trend.',
    {},
    async () => {
      const [recentSessions, prRows, overdueRows, trendRows] = await Promise.all([
        db.query.sessions.findMany({
          where: eq(sessions.userId, userId),
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
          WHERE s.weight_kg IS NOT NULL AND sess.user_id = ${userId}
          ORDER BY se.name ASC, s.weight_kg DESC
        `),
        db.execute<OverdueRow>(sql`
          SELECT
            pe.name AS exercise,
            MAX(sess.date) AS last_date
          FROM ${planExercises} pe
          JOIN ${plans} p ON pe.plan_id = p.id
          LEFT JOIN ${sessionExercises} se ON se.name ILIKE pe.name
          LEFT JOIN ${sessions} sess ON se.session_id = sess.id AND sess.user_id = ${userId}
          WHERE p.user_id = ${userId}
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
            AND sess.user_id = ${userId}
          GROUP BY se.name
          ORDER BY se.name ASC
        `),
      ])

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
        personal_records: (prRows as PrRow[]).map((r) => ({
          exercise: r.exercise,
          weight_kg: parseFloat(r.weight_kg),
          reps: r.reps,
          date: r.date,
        })),
        overdue_exercises: (overdueRows as OverdueRow[]).map((r) => ({
          name: r.exercise,
          days_since_last_session: r.last_date
            ? Math.floor((Date.now() - new Date(r.last_date).getTime()) / 86_400_000)
            : null,
        })),
        volume_trend: (trendRows as VolumeTrendRow[]).map((r) => ({
          exercise: r.exercise,
          current_2w_volume: r.current_2w != null ? parseFloat(r.current_2w) : 0,
          previous_2w_volume: r.previous_2w != null ? parseFloat(r.previous_2w) : 0,
        })),
      }

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    }
  )

  server.tool(
    'create_plan',
    'Creates a new workout plan with exercises atomically.',
    {
      name: z.string().min(1),
      notes: z.string().nullable().optional(),
      exercises: z.array(
        z.object({
          name: z.string().min(1),
          target_sets: z.number().int().min(1),
          target_reps: z.number().int().min(1),
          target_weight_kg: z.number().min(0).nullable().optional(),
          notes: z.string().nullable().optional(),
        })
      ),
    },
    async ({ name, notes, exercises }) => {
      const planId = await db.transaction(async (tx) => {
        const [plan] = await tx
          .insert(plans)
          .values({ userId, name, notes: notes ?? null })
          .returning({ id: plans.id })

        if (exercises.length > 0) {
          await tx.insert(planExercises).values(
            exercises.map((ex, i) => ({
              planId: plan.id,
              name: ex.name,
              sortOrder: i,
              targetSets: ex.target_sets,
              targetReps: ex.target_reps,
              targetWeightKg:
                ex.target_weight_kg != null ? ex.target_weight_kg.toString() : null,
              notes: ex.notes ?? null,
            }))
          )
        }

        return plan.id
      })

      const result = { success: true, plan_id: planId }
      return { content: [{ type: 'text', text: JSON.stringify(result) }] }
    }
  )

  server.tool(
    'update_plan',
    'Replaces all exercises for an existing plan atomically. Always send the full exercise list.',
    {
      plan_id: z.string().min(1),
      name: z.string().min(1),
      notes: z.string().nullable().optional(),
      exercises: z.array(
        z.object({
          name: z.string().min(1),
          target_sets: z.number().int().min(1),
          target_reps: z.number().int().min(1),
          target_weight_kg: z.number().min(0).nullable().optional(),
          notes: z.string().nullable().optional(),
        })
      ),
    },
    async ({ plan_id, name, notes, exercises }) => {
      const updated = await db.transaction(async (tx) => {
        const existing = await tx.query.plans.findFirst({
          where: and(eq(plans.id, plan_id), eq(plans.userId, userId)),
        })
        if (!existing) return false

        await tx.update(plans).set({ name, notes: notes ?? null }).where(eq(plans.id, plan_id))
        await tx.delete(planExercises).where(eq(planExercises.planId, plan_id))

        if (exercises.length > 0) {
          await tx.insert(planExercises).values(
            exercises.map((ex, i) => ({
              planId: plan_id,
              name: ex.name,
              sortOrder: i,
              targetSets: ex.target_sets,
              targetReps: ex.target_reps,
              targetWeightKg:
                ex.target_weight_kg != null ? ex.target_weight_kg.toString() : null,
              notes: ex.notes ?? null,
            }))
          )
        }

        return true
      })

      if (!updated) {
        return {
          content: [{ type: 'text', text: `Error: Plan "${plan_id}" not found` }],
          isError: true,
        }
      }

      return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }] }
    }
  )

  server.tool(
    'delete_plan',
    'Permanently deletes a workout plan and its exercises.',
    { plan_id: z.string().min(1) },
    async ({ plan_id }) => {
      const existing = await db.query.plans.findFirst({
        where: and(eq(plans.id, plan_id), eq(plans.userId, userId)),
      })
      if (!existing) {
        return {
          content: [{ type: 'text', text: `Error: Plan "${plan_id}" not found` }],
          isError: true,
        }
      }

      await db.delete(plans).where(eq(plans.id, plan_id))
      return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }] }
    }
  )

  server.tool(
    'log_session',
    'Logs a complete workout session atomically (session + exercises + sets in one call).',
    {
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
      name: z.string().min(1),
      notes: z.string().nullable().optional(),
      exercises: z.array(
        z.object({
          name: z.string().min(1),
          sets: z.array(
            z.object({
              reps: z.number().int().min(0).nullable().optional(),
              weight_kg: z.number().min(0).nullable().optional(),
            })
          ).min(1),
        })
      ).min(1),
    },
    async ({ date, name, notes, exercises }) => {
      const sessionId = await db.transaction(async (tx) => {
        const [session] = await tx
          .insert(sessions)
          .values({ userId, date, name, notes: notes ?? null })
          .returning({ id: sessions.id })

        for (let i = 0; i < exercises.length; i++) {
          const ex = exercises[i]!
          const [se] = await tx
            .insert(sessionExercises)
            .values({ sessionId: session.id, name: ex.name, sortOrder: i })
            .returning({ id: sessionExercises.id })

          if (ex.sets.length > 0) {
            await tx.insert(sets).values(
              ex.sets.map((s, si) => ({
                sessionExerciseId: se.id,
                setNumber: si + 1,
                reps: s.reps ?? null,
                weightKg: s.weight_kg != null ? s.weight_kg.toString() : null,
              }))
            )
          }
        }

        return session.id
      })

      const result = { success: true, session_id: sessionId }
      return { content: [{ type: 'text', text: JSON.stringify(result) }] }
    }
  )

  server.tool(
    'delete_session',
    'Permanently deletes a session and all its exercises and sets.',
    { session_id: z.string().min(1) },
    async ({ session_id }) => {
      const existing = await db.query.sessions.findFirst({
        where: and(eq(sessions.id, session_id), eq(sessions.userId, userId)),
      })

      if (!existing) {
        return {
          content: [{ type: 'text', text: `Error: Session "${session_id}" not found` }],
          isError: true,
        }
      }

      await db.delete(sessions).where(eq(sessions.id, session_id))
      return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }] }
    }
  )

  return server
}
