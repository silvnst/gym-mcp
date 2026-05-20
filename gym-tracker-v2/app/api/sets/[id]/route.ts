import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, sets } from '@/lib/db'
import { getAuthUser, unauthorized } from '@/lib/auth'

function numOrNull(v: string | null | undefined): number | null {
  if (v == null) return null
  const n = parseFloat(v)
  return isNaN(n) ? null : n
}

const updateSetSchema = z.object({
  reps: z.number().int().nullable().optional(),
  weightKg: z.number().nullable().optional(),
  setNumber: z.number().int().min(1).optional(),
})

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  const { id: setId } = await params

  const parsed = updateSetSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  const existing = await db.query.sets.findFirst({ where: eq(sets.id, setId) })
  if (!existing) {
    return NextResponse.json({ error: 'Set not found' }, { status: 404 })
  }

  const updates: Partial<{ reps: number | null; weightKg: string | null; setNumber: number }> = {}
  if (parsed.data.reps !== undefined) updates.reps = parsed.data.reps
  if (parsed.data.weightKg !== undefined) {
    updates.weightKg = parsed.data.weightKg != null ? parsed.data.weightKg.toString() : null
  }
  if (parsed.data.setNumber !== undefined) updates.setNumber = parsed.data.setNumber

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({
      id: existing.id,
      sessionExerciseId: existing.sessionExerciseId,
      setNumber: existing.setNumber,
      reps: existing.reps,
      weightKg: numOrNull(existing.weightKg),
    })
  }

  const [updated] = await db.update(sets).set(updates).where(eq(sets.id, setId)).returning()

  return NextResponse.json({
    id: updated.id,
    sessionExerciseId: updated.sessionExerciseId,
    setNumber: updated.setNumber,
    reps: updated.reps,
    weightKg: numOrNull(updated.weightKg),
  })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  const { id: setId } = await params

  const existing = await db.query.sets.findFirst({ where: eq(sets.id, setId) })
  if (!existing) {
    return NextResponse.json({ error: 'Set not found' }, { status: 404 })
  }

  await db.delete(sets).where(eq(sets.id, setId))
  return NextResponse.json({ success: true })
}
