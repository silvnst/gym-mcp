import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, sets } from "@workspace/db";

const router: IRouter = Router();

function numOrNull(v: string | null | undefined): number | null {
  if (v == null) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

const updateSetSchema = z.object({
  reps: z.number().int().nullable().optional(),
  weightKg: z.number().nullable().optional(),
  setNumber: z.number().int().min(1).nullable().optional(),
});

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

    const updates: Record<string, any> = {};
    if (parsed.data.reps !== undefined) updates["reps"] = parsed.data.reps;
    if (parsed.data.weightKg !== undefined)
      updates["weightKg"] = parsed.data.weightKg?.toString() ?? null;
    if (parsed.data.setNumber !== undefined)
      updates["setNumber"] = parsed.data.setNumber;

    const [updated] = await db
      .update(sets)
      .set(updates)
      .where(eq(sets.id, setId))
      .returning();

    res.json({
      id: updated.id,
      sessionExerciseId: updated.sessionExerciseId,
      setNumber: updated.setNumber,
      reps: updated.reps,
      weightKg: numOrNull(updated.weightKg),
    });
  } catch (err) {
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
  } catch (err) {
    res.status(500).json({ error: "Failed to delete set" });
  }
});

export default router;
