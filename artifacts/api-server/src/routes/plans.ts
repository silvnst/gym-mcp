import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";
import { db, plans, planExercises } from "@workspace/db";

const router: IRouter = Router();

function numOrNull(v: string | null | undefined): number | null {
  if (v == null) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

async function getPlanWithExercises(planId: string) {
  const plan = await db.query.plans.findFirst({
    where: eq(plans.id, planId),
    with: {
      planExercises: { orderBy: (pe, { asc }) => [asc(pe.sortOrder)] },
    },
  });
  if (!plan) return null;
  return {
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
  };
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

router.get("/plans", async (_req, res) => {
  try {
    const allPlans = await db.query.plans.findMany({
      with: {
        planExercises: { orderBy: (pe, { asc }) => [asc(pe.sortOrder)] },
      },
      orderBy: (p, { desc }) => [desc(p.createdAt)],
    });

    res.json(
      allPlans.map((plan) => ({
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
      })),
    );
  } catch (err) {
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
    const [plan] = await db.insert(plans).values({ name, notes }).returning();

    if (exercises.length > 0) {
      await db.insert(planExercises).values(
        exercises.map((ex, i) => ({
          planId: plan.id,
          name: ex.name,
          sortOrder: ex.sortOrder ?? i,
          targetSets: ex.targetSets,
          targetReps: ex.targetReps,
          targetWeightKg: ex.targetWeightKg?.toString(),
          notes: ex.notes,
        })),
      );
    }

    const result = await getPlanWithExercises(plan.id);
    res.status(201).json(result);
  } catch (err) {
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
  } catch (err) {
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
    const existing = await db.query.plans.findFirst({
      where: eq(plans.id, planId),
    });
    if (!existing) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }

    await db.update(plans).set({ name, notes }).where(eq(plans.id, planId));

    await db.delete(planExercises).where(eq(planExercises.planId, planId));

    if (exercises.length > 0) {
      await db.insert(planExercises).values(
        exercises.map((ex, i) => ({
          planId,
          name: ex.name,
          sortOrder: ex.sortOrder ?? i,
          targetSets: ex.targetSets,
          targetReps: ex.targetReps,
          targetWeightKg: ex.targetWeightKg?.toString(),
          notes: ex.notes,
        })),
      );
    }

    const result = await getPlanWithExercises(planId);
    res.json(result);
  } catch (err) {
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
  } catch (err) {
    res.status(500).json({ error: "Failed to delete plan" });
  }
});

export default router;
