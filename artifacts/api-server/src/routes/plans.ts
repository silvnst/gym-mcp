import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, plans, planExercises, type Plan, type PlanExercise } from "@workspace/db";

const router: IRouter = Router();

function numOrNull(v: string | null | undefined): number | null {
  if (v == null) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function serializePlanExercise(pe: PlanExercise) {
  return {
    id: pe.id,
    planId: pe.planId,
    name: pe.name,
    sortOrder: pe.sortOrder,
    targetSets: pe.targetSets,
    targetReps: pe.targetReps,
    targetWeightKg: numOrNull(pe.targetWeightKg),
    notes: pe.notes,
  };
}

function serializePlan(plan: Plan & { planExercises: PlanExercise[] }) {
  return {
    id: plan.id,
    name: plan.name,
    notes: plan.notes,
    createdAt: plan.createdAt,
    exercises: plan.planExercises.map(serializePlanExercise),
  };
}

async function getPlanWithExercises(planId: string) {
  const plan = await db.query.plans.findFirst({
    where: eq(plans.id, planId),
    with: {
      planExercises: { orderBy: (pe, { asc }) => [asc(pe.sortOrder)] },
    },
  });
  if (!plan) return null;
  return serializePlan(plan);
}

const createPlanExerciseSchema = z.object({
  name: z.string().min(1),
  sortOrder: z.number().int(),
  targetSets: z.number().int().min(1),
  targetReps: z.number().int().min(1),
  targetWeightKg: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const createPlanSchema = z.object({
  name: z.string().min(1),
  notes: z.string().nullable().optional(),
  exercises: z.array(createPlanExerciseSchema),
});

type CreatePlanInput = z.infer<typeof createPlanSchema>;

function buildExerciseValues(exercises: CreatePlanInput["exercises"], planId: string) {
  return exercises.map((ex, i) => ({
    planId,
    name: ex.name,
    sortOrder: ex.sortOrder ?? i,
    targetSets: ex.targetSets,
    targetReps: ex.targetReps,
    targetWeightKg: ex.targetWeightKg != null ? ex.targetWeightKg.toString() : null,
    notes: ex.notes ?? null,
  }));
}

router.get("/plans", async (_req, res) => {
  try {
    const allPlans = await db.query.plans.findMany({
      with: {
        planExercises: { orderBy: (pe, { asc }) => [asc(pe.sortOrder)] },
      },
      orderBy: (p, { desc }) => [desc(p.createdAt)],
    });
    res.json(allPlans.map(serializePlan));
  } catch {
    res.status(500).json({ error: "Failed to list plans" });
  }
});

router.post("/plans", async (req, res) => {
  const parsed = createPlanSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, notes, exercises } = parsed.data;

  try {
    const planId = await db.transaction(async (tx) => {
      const [plan] = await tx.insert(plans).values({ name, notes }).returning();
      if (exercises.length > 0) {
        await tx.insert(planExercises).values(buildExerciseValues(exercises, plan.id));
      }
      return plan.id;
    });

    const result = await getPlanWithExercises(planId);
    res.status(201).json(result);
  } catch {
    res.status(500).json({ error: "Failed to create plan" });
  }
});

router.get("/plans/:id", async (req, res) => {
  try {
    const plan = await getPlanWithExercises(req.params.id!);
    if (!plan) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }
    res.json(plan);
  } catch {
    res.status(500).json({ error: "Failed to get plan" });
  }
});

router.put("/plans/:id", async (req, res) => {
  const parsed = createPlanSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, notes, exercises } = parsed.data;
  const planId = req.params.id!;

  try {
    const updated = await db.transaction(async (tx) => {
      const existing = await tx.query.plans.findFirst({
        where: eq(plans.id, planId),
      });
      if (!existing) return null;

      await tx.update(plans).set({ name, notes }).where(eq(plans.id, planId));
      await tx.delete(planExercises).where(eq(planExercises.planId, planId));

      if (exercises.length > 0) {
        await tx.insert(planExercises).values(buildExerciseValues(exercises, planId));
      }
      return planId;
    });

    if (!updated) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }

    const result = await getPlanWithExercises(planId);
    res.json(result);
  } catch {
    res.status(500).json({ error: "Failed to update plan" });
  }
});

router.delete("/plans/:id", async (req, res) => {
  try {
    const existing = await db.query.plans.findFirst({
      where: eq(plans.id, req.params.id!),
    });
    if (!existing) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }
    await db.delete(plans).where(eq(plans.id, req.params.id!));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete plan" });
  }
});

export default router;
