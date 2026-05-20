import { Router, type IRouter } from "express";
import { eq, desc, and, ne } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  plans,
  sessions,
  sessionExercises,
  sets,
  type Session,
  type SessionExercise,
  type Set,
} from "@workspace/db";

const router: IRouter = Router();

function numOrNull(v: string | null | undefined): number | null {
  if (v == null) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

type SessionExerciseWithSets = SessionExercise & { sets: Set[] };
type SessionWithDetail = Session & { sessionExercises: SessionExerciseWithSets[] };
type LastSetMap = Map<number, { weightKg: number | null; reps: number | null }>;

function serializeSet(s: Set, lastBySetNumber?: LastSetMap) {
  const last = lastBySetNumber?.get(s.setNumber);
  return {
    id: s.id,
    sessionExerciseId: s.sessionExerciseId,
    setNumber: s.setNumber,
    reps: s.reps,
    weightKg: numOrNull(s.weightKg),
    lastReps: last ? last.reps : null,
    lastWeightKg: last ? last.weightKg : null,
  };
}

function serializeSessionExercise(se: SessionExerciseWithSets, lastBySetNumber?: LastSetMap) {
  return {
    id: se.id,
    sessionId: se.sessionId,
    planExerciseId: se.planExerciseId,
    name: se.name,
    sortOrder: se.sortOrder,
    targetSets: se.targetSets,
    targetReps: se.targetReps,
    targetWeightKg: numOrNull(se.targetWeightKg),
    sets: se.sets.map((s) => serializeSet(s, lastBySetNumber)),
  };
}

async function fetchLastSessionSetsForExercises(
  exerciseNames: string[],
  currentSessionId: string,
): Promise<Map<string, LastSetMap>> {
  if (exerciseNames.length === 0) return new Map();

  const result = new Map<string, LastSetMap>();

  for (const name of exerciseNames) {
    const lastExercise = await db
      .select({
        exerciseId: sessionExercises.id,
        sessionDate: sessions.date,
        sessionCreatedAt: sessions.createdAt,
      })
      .from(sessionExercises)
      .innerJoin(sessions, eq(sessionExercises.sessionId, sessions.id))
      .where(and(eq(sessionExercises.name, name), ne(sessionExercises.sessionId, currentSessionId)))
      .orderBy(desc(sessions.date), desc(sessions.createdAt))
      .limit(1);

    if (lastExercise.length === 0) continue;

    const lastExerciseId = lastExercise[0]!.exerciseId;
    const lastSets = await db.query.sets.findMany({
      where: eq(sets.sessionExerciseId, lastExerciseId),
      orderBy: (s, { asc }) => [asc(s.setNumber)],
    });

    const bySetNumber: LastSetMap = new Map();
    for (const s of lastSets) {
      bySetNumber.set(s.setNumber, {
        weightKg: numOrNull(s.weightKg),
        reps: s.reps,
      });
    }
    result.set(name, bySetNumber);
  }

  return result;
}

async function getSessionWithDetail(sessionId: string) {
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: {
      sessionExercises: {
        orderBy: (se, { asc }) => [asc(se.sortOrder)],
        with: {
          sets: { orderBy: (s, { asc }) => [asc(s.setNumber)] },
        },
      },
    },
  });
  if (!session) return null;

  const exerciseNames = [...new Set(session.sessionExercises.map((se) => se.name))];
  const lastSetsMap = await fetchLastSessionSetsForExercises(exerciseNames, sessionId);

  return {
    id: session.id,
    planId: session.planId,
    date: session.date,
    name: session.name,
    notes: session.notes,
    createdAt: session.createdAt,
    exercises: session.sessionExercises.map((se) =>
      serializeSessionExercise(se, lastSetsMap.get(se.name)),
    ),
  };
}

const createSessionExerciseSchema = z.object({
  name: z.string().min(1),
  sortOrder: z.number().int(),
  targetSets: z.number().int().nullable().optional(),
  targetReps: z.number().int().nullable().optional(),
  targetWeightKg: z.number().nullable().optional(),
  planExerciseId: z.string().nullable().optional(),
});

const createSessionSchema = z.object({
  planId: z.string().nullable().optional(),
  date: z.string().min(1),
  name: z.string().min(1),
  notes: z.string().nullable().optional(),
  exercises: z.array(createSessionExerciseSchema).nullable().optional(),
});

type CreateSessionExercise = z.infer<typeof createSessionExerciseSchema>;

function buildSessionExerciseValues(
  exercises: CreateSessionExercise[],
  sessionId: string,
) {
  return exercises.map((ex, i) => ({
    sessionId,
    planExerciseId: ex.planExerciseId ?? null,
    name: ex.name,
    sortOrder: ex.sortOrder ?? i,
    targetSets: ex.targetSets ?? null,
    targetReps: ex.targetReps ?? null,
    targetWeightKg: ex.targetWeightKg != null ? ex.targetWeightKg.toString() : null,
  }));
}

router.get("/sessions", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query["limit"] ?? 20), 100);
    const offset = Number(req.query["offset"] ?? 0);

    const allSessions = await db.query.sessions.findMany({
      orderBy: [desc(sessions.date)],
      limit,
      offset,
    });

    res.json(
      allSessions.map((s) => ({
        id: s.id,
        planId: s.planId,
        date: s.date,
        name: s.name,
        notes: s.notes,
        createdAt: s.createdAt,
      })),
    );
  } catch {
    res.status(500).json({ error: "Failed to list sessions" });
  }
});

router.post("/sessions", async (req, res) => {
  const parsed = createSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { planId, date, name, notes, exercises: bodyExercises } = parsed.data;

  try {
    const sessionId = await db.transaction(async (tx) => {
      const [session] = await tx
        .insert(sessions)
        .values({ planId: planId ?? null, date, name, notes: notes ?? null })
        .returning();

      let exercisesToInsert: ReturnType<typeof buildSessionExerciseValues> = [];

      if (bodyExercises && bodyExercises.length > 0) {
        exercisesToInsert = buildSessionExerciseValues(bodyExercises, session.id);
      } else if (planId) {
        const plan = await tx.query.plans.findFirst({
          where: eq(plans.id, planId),
          with: {
            planExercises: { orderBy: (pe, { asc }) => [asc(pe.sortOrder)] },
          },
        });
        if (plan) {
          exercisesToInsert = plan.planExercises.map((pe) => ({
            sessionId: session.id,
            planExerciseId: pe.id,
            name: pe.name,
            sortOrder: pe.sortOrder,
            targetSets: pe.targetSets,
            targetReps: pe.targetReps,
            targetWeightKg: pe.targetWeightKg,
          }));
        }
      }

      if (exercisesToInsert.length > 0) {
        await tx.insert(sessionExercises).values(exercisesToInsert);
      }

      return session.id;
    });

    const result = await getSessionWithDetail(sessionId);
    res.status(201).json(result);
  } catch {
    res.status(500).json({ error: "Failed to create session" });
  }
});

router.get("/sessions/:id", async (req, res) => {
  try {
    const session = await getSessionWithDetail(req.params.id!);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    res.json(session);
  } catch {
    res.status(500).json({ error: "Failed to get session" });
  }
});

router.post("/sessions/:id/exercises", async (req, res) => {
  const parsed = createSessionExerciseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const sessionId = req.params.id!;

  try {
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
    });
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
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
        targetWeightKg: parsed.data.targetWeightKg != null ? parsed.data.targetWeightKg.toString() : null,
      })
      .returning();

    const result = await db.query.sessionExercises.findFirst({
      where: eq(sessionExercises.id, newExercise.id),
      with: { sets: true },
    });

    res.status(201).json(serializeSessionExercise(result as SessionExerciseWithSets));
  } catch {
    res.status(500).json({ error: "Failed to add exercise to session" });
  }
});

router.delete("/sessions/:id", async (req, res) => {
  try {
    const existing = await db.query.sessions.findFirst({
      where: eq(sessions.id, req.params.id!),
    });
    if (!existing) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    await db.delete(sessions).where(eq(sessions.id, req.params.id!));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete session" });
  }
});

const addSetSchema = z.object({
  sessionExerciseId: z.string().min(1),
  setNumber: z.number().int().min(1),
  reps: z.number().int().nullable().optional(),
  weightKg: z.number().nullable().optional(),
});

router.post("/sessions/:id/sets", async (req, res) => {
  const parsed = addSetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { sessionExerciseId, setNumber, reps, weightKg } = parsed.data;
  const sessionId = req.params.id!;

  try {
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
    });
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const se = await db.query.sessionExercises.findFirst({
      where: eq(sessionExercises.id, sessionExerciseId),
    });
    if (!se || se.sessionId !== sessionId) {
      res.status(404).json({ error: "Session exercise not found in this session" });
      return;
    }

    const [newSet] = await db
      .insert(sets)
      .values({
        sessionExerciseId,
        setNumber,
        reps: reps ?? null,
        weightKg: weightKg != null ? weightKg.toString() : null,
      })
      .returning();

    res.status(201).json(serializeSet(newSet));
  } catch {
    res.status(500).json({ error: "Failed to add set" });
  }
});

export default router;
