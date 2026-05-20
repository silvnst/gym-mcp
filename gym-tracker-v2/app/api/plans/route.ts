import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, plans, planExercises } from '@/lib/db'
import { getAuthUser, unauthorized } from '@/lib/auth'

function numOrNull(v: string | null | undefined): number | null {
  if (v == null) return null
  const n = parseFloat(v)
  return isNaN(n) ? null : n
}

export async function GET() {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  const allPlans = await db.query.plans.findMany({
    where: eq(plans.userId, user.id),
    orderBy: (p, { asc }) => [asc(p.name)],
    with: { planExercises: { orderBy: (pe, { asc }) => [asc(pe.sortOrder)] } },
  })

  return NextResponse.json(
    allPlans.map((p) => ({
      id: p.id,
      name: p.name,
      notes: p.notes,
      createdAt: p.createdAt,
      exercises: p.planExercises.map((pe) => ({
        id: pe.id,
        planId: pe.planId,
        name: pe.name,
        sortOrder: pe.sortOrder,
        targetSets: pe.targetSets,
        targetReps: pe.targetReps,
        targetWeightKg: numOrNull(pe.targetWeightKg),
        notes: pe.notes,
      })),
    }))
  )
}

const createPlanSchema = z.object({
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

export async function POST(request: Request) {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  const body = await request.json()
  const parsed = createPlanSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  const { name, notes, exercises } = parsed.data

  const planId = await db.transaction(async (tx) => {
    const [plan] = await tx
      .insert(plans)
      .values({ userId: user.id, name, notes: notes ?? null })
      .returning({ id: plans.id })
    if (exercises && exercises.length > 0) {
      await tx.insert(planExercises).values(
        exercises.map((ex, i) => ({
          planId: plan.id,
          name: ex.name,
          sortOrder: ex.sortOrder ?? i,
          targetSets: ex.targetSets,
          targetReps: ex.targetReps,
          targetWeightKg: ex.targetWeightKg != null ? ex.targetWeightKg.toString() : null,
          notes: ex.notes ?? null,
        }))
      )
    }
    return plan.id
  })

  const result = await db.query.plans.findFirst({
    where: eq(plans.id, planId),
    with: { planExercises: { orderBy: (pe, { asc }) => [asc(pe.sortOrder)] } },
  })

  return NextResponse.json(
    {
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
    },
    { status: 201 }
  )
}
