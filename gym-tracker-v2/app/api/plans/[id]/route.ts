import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, plans, planExercises } from '@/lib/db'
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

  const plan = await db.query.plans.findFirst({
    where: and(eq(plans.id, id), eq(plans.userId, user.id)),
    with: { planExercises: { orderBy: (pe, { asc }) => [asc(pe.sortOrder)] } },
  })

  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  return NextResponse.json({
    id: plan.id,
    name: plan.name,
    notes: plan.notes,
    createdAt: plan.createdAt,
    exercises: plan.planExercises.map((pe) => ({
      id: pe.id,
      planId: pe.planId,
      name: pe.name,
      sortOrder: pe.sortOrder,
      targetSets: pe.targetSets,
      targetReps: pe.targetReps,
      targetWeightKg: numOrNull(pe.targetWeightKg),
      notes: pe.notes,
    })),
  })
}

const updatePlanSchema = z.object({
  name: z.string().min(1),
  notes: z.string().nullable().optional(),
  exercises: z
    .array(
      z.object({
        name: z.string().min(1),
        sortOrder: z.number().int(),
        targetSets: z.number().int(),
        targetReps: z.number().int(),
        targetWeightKg: z.number().nullable().optional(),
        notes: z.string().nullable().optional(),
      })
    )
    .optional(),
})

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  const { id } = await params

  const body = await request.json()
  const parsed = updatePlanSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  const { name, notes, exercises } = parsed.data

  const updated = await db.transaction(async (tx) => {
    const existing = await tx.query.plans.findFirst({
      where: and(eq(plans.id, id), eq(plans.userId, user.id)),
    })
    if (!existing) return null

    await tx.update(plans).set({ name, notes: notes ?? null }).where(eq(plans.id, id))
    await tx.delete(planExercises).where(eq(planExercises.planId, id))

    if (exercises && exercises.length > 0) {
      await tx.insert(planExercises).values(
        exercises.map((ex, i) => ({
          planId: id,
          name: ex.name,
          sortOrder: ex.sortOrder ?? i,
          targetSets: ex.targetSets,
          targetReps: ex.targetReps,
          targetWeightKg: ex.targetWeightKg != null ? ex.targetWeightKg.toString() : null,
          notes: ex.notes ?? null,
        }))
      )
    }
    return id
  })

  if (!updated) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  const result = await db.query.plans.findFirst({
    where: eq(plans.id, id),
    with: { planExercises: { orderBy: (pe, { asc }) => [asc(pe.sortOrder)] } },
  })

  return NextResponse.json({
    id: result!.id,
    name: result!.name,
    notes: result!.notes,
    createdAt: result!.createdAt,
    exercises: result!.planExercises.map((pe) => ({
      id: pe.id,
      planId: pe.planId,
      name: pe.name,
      sortOrder: pe.sortOrder,
      targetSets: pe.targetSets,
      targetReps: pe.targetReps,
      targetWeightKg: numOrNull(pe.targetWeightKg),
      notes: pe.notes,
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

  const existing = await db.query.plans.findFirst({
    where: and(eq(plans.id, id), eq(plans.userId, user.id)),
  })
  if (!existing) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  await db.delete(plans).where(eq(plans.id, id))
  return NextResponse.json({ success: true })
}
