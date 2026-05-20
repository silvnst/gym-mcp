import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, sessions, sessionExercises } from '@/lib/db'
import { getAuthUser, unauthorized } from '@/lib/auth'

function numOrNull(v: string | null | undefined): number | null {
  if (v == null) return null
  const n = parseFloat(v)
  return isNaN(n) ? null : n
}

const createSessionExerciseSchema = z.object({
  name: z.string().min(1),
  sortOrder: z.number().int(),
  targetSets: z.number().int().nullable().optional(),
  targetReps: z.number().int().nullable().optional(),
  targetWeightKg: z.number().nullable().optional(),
  planExerciseId: z.string().nullable().optional(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  const { id: sessionId } = await params

  const parsed = createSessionExerciseSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  const session = await db.query.sessions.findFirst({
    where: and(eq(sessions.id, sessionId), eq(sessions.userId, user.id)),
  })
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const [newExercise] = await db
    .insert(sessionExercises)
    .values({
      sessionId,
      planExerciseId: parsed.data.planExerciseId ?? null,
      name: parsed.data.name,
      sortOrder: parsed.data.sortOrder,
      targetSets: parsed.data.targetSets ?? null,
      targetReps: parsed.data.targetReps ?? null,
      targetWeightKg:
        parsed.data.targetWeightKg != null ? parsed.data.targetWeightKg.toString() : null,
    })
    .returning()

  const result = await db.query.sessionExercises.findFirst({
    where: eq(sessionExercises.id, newExercise.id),
    with: { sets: true },
  })

  return NextResponse.json(
    {
      id: result!.id,
      sessionId: result!.sessionId,
      planExerciseId: result!.planExerciseId,
      name: result!.name,
      sortOrder: result!.sortOrder,
      targetSets: result!.targetSets,
      targetReps: result!.targetReps,
      targetWeightKg: numOrNull(result!.targetWeightKg),
      sets: result!.sets.map((s) => ({
        id: s.id,
        sessionExerciseId: s.sessionExerciseId,
        setNumber: s.setNumber,
        reps: s.reps,
        weightKg: numOrNull(s.weightKg),
      })),
    },
    { status: 201 }
  )
}
