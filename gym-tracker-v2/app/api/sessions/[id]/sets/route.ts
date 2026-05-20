import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, sessions, sessionExercises, sets } from '@/lib/db'
import { getAuthUser, unauthorized } from '@/lib/auth'

function numOrNull(v: string | null | undefined): number | null {
  if (v == null) return null
  const n = parseFloat(v)
  return isNaN(n) ? null : n
}

const addSetSchema = z.object({
  sessionExerciseId: z.string().min(1),
  setNumber: z.number().int().min(1),
  reps: z.number().int().nullable().optional(),
  weightKg: z.number().nullable().optional(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  const { id: sessionId } = await params

  const parsed = addSetSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  const { sessionExerciseId, setNumber, reps, weightKg } = parsed.data

  const session = await db.query.sessions.findFirst({
    where: and(eq(sessions.id, sessionId), eq(sessions.userId, user.id)),
  })
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const se = await db.query.sessionExercises.findFirst({
    where: eq(sessionExercises.id, sessionExerciseId),
  })
  if (!se || se.sessionId !== sessionId) {
    return NextResponse.json(
      { error: 'Session exercise not found in this session' },
      { status: 404 }
    )
  }

  const [newSet] = await db
    .insert(sets)
    .values({
      sessionExerciseId,
      setNumber,
      reps: reps ?? null,
      weightKg: weightKg != null ? weightKg.toString() : null,
    })
    .returning()

  return NextResponse.json(
    {
      id: newSet.id,
      sessionExerciseId: newSet.sessionExerciseId,
      setNumber: newSet.setNumber,
      reps: newSet.reps,
      weightKg: numOrNull(newSet.weightKg),
    },
    { status: 201 }
  )
}
