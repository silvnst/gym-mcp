import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, sets, type Set } from "@workspace/db";

const router: IRouter = Router();

function numOrNull(v: string | null | undefined): number | null {
  if (v == null) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function serializeSet(s: Set) {
  return {
    id: s.id,
    sessionExerciseId: s.sessionExerciseId,
    setNumber: s.setNumber,
    reps: s.reps,
    weightKg: numOrNull(s.weightKg),
  };
}

const updateSetSchema = z.object({
  reps: z.number().int().nullable().optional(),
  weightKg: z.number().nullable().optional(),
  setNumber: z.number().int().min(1).optional(),
});

type UpdateSetInput = z.infer<typeof updateSetSchema>;

function buildSetUpdates(data: UpdateSetInput): Partial<{
  reps: number | null;
  weightKg: string | null;
  setNumber: number;
}> {
  const updates: Partial<{ reps: number | null; weightKg: string | null; setNumber: number }> = {};
  if (data.reps !== undefined) updates.reps = data.reps;
  if (data.weightKg !== undefined) updates.weightKg = data.weightKg != null ? data.weightKg.toString() : null;
  if (data.setNumber !== undefined) updates.setNumber = data.setNumber;
  return updates;
}

router.put("/sets/:id", async (req, res) => {
  const parsed = updateSetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const setId = req.params.id!;

  try {
    const existing = await db.query.sets.findFirst({
      where: eq(sets.id, setId),
    });
    if (!existing) {
      res.status(404).json({ error: "Set not found" });
      return;
    }

    const updates = buildSetUpdates(parsed.data);
    if (Object.keys(updates).length === 0) {
      res.json(serializeSet(existing));
      return;
    }

    const [updated] = await db
      .update(sets)
      .set(updates)
      .where(eq(sets.id, setId))
      .returning();

    res.json(serializeSet(updated));
  } catch {
    res.status(500).json({ error: "Failed to update set" });
  }
});

router.delete("/sets/:id", async (req, res) => {
  try {
    const existing = await db.query.sets.findFirst({
      where: eq(sets.id, req.params.id!),
    });
    if (!existing) {
      res.status(404).json({ error: "Set not found" });
      return;
    }
    await db.delete(sets).where(eq(sets.id, req.params.id!));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete set" });
  }
});

export default router;
