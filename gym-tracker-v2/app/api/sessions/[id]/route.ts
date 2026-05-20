import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db, sessions } from '@/lib/db'
import { getAuthUser, unauthorized } from '@/lib/auth'

function numOrNull(v: string | null | undefined): number | null {
  if (v == null) return null
  const n = parseFloat(v)
  return isNaN(n) ? null : n
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  const { id } = await params

  const session = await db.query.sessions.findFirst({
    where: and(eq(sessions.id, id), eq(sessions.userId, user.id)),
    with: {
      sessionExercises: {
        orderBy: (se, { asc }) => [asc(se.sortOrder)],
        with: { sets: { orderBy: (s, { asc }) => [asc(s.setNumber)] } },
      },
    },
  })

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  return NextResponse.json({
    id: session.id,
    planId: session.planId,
    date: session.date,
    name: session.name,
    notes: session.notes,
    createdAt: session.createdAt,
    exercises: session.sessionExercises.map((se) => ({
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
  })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  const { id } = await params

  const existing = await db.query.sessions.findFirst({
    where: and(eq(sessions.id, id), eq(sessions.userId, user.id)),
  })
  if (!existing) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  await db.delete(sessions).where(eq(sessions.id, id))
  return NextResponse.json({ success: true })
}
