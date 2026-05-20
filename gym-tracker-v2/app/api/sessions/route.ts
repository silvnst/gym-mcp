import { NextResponse } from 'next/server'
import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, plans, sessions, sessionExercises } from '@/lib/db'
import { getAuthUser, unauthorized } from '@/lib/auth'

function numOrNull(v: string | null | undefined): number | null {
  if (v == null) return null
  const n = parseFloat(v)
  return isNaN(n) ? null : n
}

export async function GET(request: Request) {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  const { searchParams } = new URL(request.url)
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 100)
  const offset = Number(searchParams.get('offset') ?? 0)

  const allSessions = await db.query.sessions.findMany({
    where: eq(sessions.userId, user.id),
    orderBy: [desc(sessions.date)],
    limit,
    offset,
  })

  return NextResponse.json(
    allSessions.map((s) => ({
      id: s.id,
      planId: s.planId,
      date: s.date,
      name: s.name,
      notes: s.notes,
      createdAt: s.createdAt,
    }))
  )
}

const createSessionExerciseSchema = z.object({
  name: z.string().min(1),
  sortOrder: z.number().int(),
  targetSets: z.number().int().nullable().optional(),
  targetReps: z.number().int().nullable().optional(),
  targetWeightKg: z.number().nullable().optional(),
  planExerciseId: z.string().nullable().optional(),
})

const createSessionSchema = z.object({
  planId: z.string().nullable().optional(),
  date: z.string().min(1),
  name: z.string().min(1),
  notes: z.string().nullable().optional(),
  exercises: z.array(createSessionExerciseSchema).nullable().optional(),
})

export async function POST(request: Request) {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  const body = await request.json()
  const parsed = createSessionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  const { planId, date, name, notes, exercises: bodyExercises } = parsed.data

  const sessionId = await db.transaction(async (tx) => {
    const [session] = await tx
      .insert(sessions)
      .values({ userId: user.id, planId: planId ?? null, date, name, notes: notes ?? null })
      .returning()

    type ExerciseInsert = {
      sessionId: string
      planExerciseId: string | null
      name: string
      sortOrder: number
      targetSets: number | null
      targetReps: number | null
      targetWeightKg: string | null
    }

    let exercisesToInsert: ExerciseInsert[] = []

    if (bodyExercises && bodyExercises.length > 0) {
      exercisesToInsert = bodyExercises.map((ex, i) => ({
        sessionId: session.id,
        planExerciseId: ex.planExerciseId ?? null,
        name: ex.name,
        sortOrder: ex.sortOrder ?? i,
        targetSets: ex.targetSets ?? null,
        targetReps: ex.targetReps ?? null,
        targetWeightKg: ex.targetWeightKg != null ? ex.targetWeightKg.toString() : null,
      }))
    } else if (planId) {
      const plan = await tx.query.plans.findFirst({
        where: eq(plans.id, planId),
        with: { planExercises: { orderBy: (pe, { asc }) => [asc(pe.sortOrder)] } },
      })
      if (plan) {
        exercisesToInsert = plan.planExercises.map((pe) => ({
          sessionId: session.id,
          planExerciseId: pe.id,
          name: pe.name,
          sortOrder: pe.sortOrder,
          targetSets: pe.targetSets,
          targetReps: pe.targetReps,
          targetWeightKg: pe.targetWeightKg,
        }))
      }
    }

    if (exercisesToInsert.length > 0) {
      await tx.insert(sessionExercises).values(exercisesToInsert)
    }

    return session.id
  })

  const result = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: {
      sessionExercises: {
        orderBy: (se, { asc }) => [asc(se.sortOrder)],
        with: { sets: { orderBy: (s, { asc }) => [asc(s.setNumber)] } },
      },
    },
  })

  return NextResponse.json(
    {
      id: result!.id,
      planId: result!.planId,
      date: result!.date,
      name: result!.name,
      notes: result!.notes,
      createdAt: result!.createdAt,
      exercises: result!.sessionExercises.map((se) => ({
        id: se.id,
        sessionId: se.sessionId,
        planExerciseId: se.planExerciseId,
        name: se.name,
        sortOrder: se.sortOrder,
        targetSets: se.targetSets,
        targetReps: se.targetReps,
        targetWeightKg: numOrNull(se.targetWeightKg),
        sets: se.sets.map((s) => ({
          id: s.id,
          sessionExerciseId: s.sessionExerciseId,
          setNumber: s.setNumber,
          reps: s.reps,
          weightKg: numOrNull(s.weightKg),
        })),
      })),
    },
    { status: 201 }
  )
}
