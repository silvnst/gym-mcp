import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

const router: IRouter = Router();

router.get("/exercises/top", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query["limit"] ?? 5), 20);

    const rows = await db.execute(sql`
      SELECT se.name, COUNT(DISTINCT se.session_id)::int AS session_count
      FROM session_exercises se
      GROUP BY se.name
      ORDER BY session_count DESC
      LIMIT ${limit}
    `);

    res.json(
      rows.rows.map((r: Record<string, unknown>) => ({
        name: r["name"] as string,
        sessionCount: r["session_count"] as number,
      })),
    );
  } catch {
    res.status(500).json({ error: "Failed to fetch top exercises" });
  }
});

router.get("/progress/:exerciseName", async (req, res) => {
  try {
    const exerciseName = decodeURIComponent(req.params.exerciseName ?? "");
    const metric = (req.query["metric"] as string) ?? "maxWeight";

    if (!exerciseName) {
      res.status(400).json({ error: "exerciseName is required" });
      return;
    }

    let rows;
    if (metric === "totalVolume") {
      rows = await db.execute(sql`
        SELECT s.date, ROUND(SUM(st.reps * CAST(st.weight_kg AS numeric)), 2)::float AS value
        FROM sessions s
        JOIN session_exercises se ON se.session_id = s.id
        JOIN sets st ON st.session_exercise_id = se.id
        WHERE se.name = ${exerciseName}
          AND st.weight_kg IS NOT NULL
          AND st.reps IS NOT NULL
        GROUP BY s.date
        ORDER BY s.date ASC
      `);
    } else {
      rows = await db.execute(sql`
        SELECT s.date, MAX(CAST(st.weight_kg AS numeric))::float AS value
        FROM sessions s
        JOIN session_exercises se ON se.session_id = s.id
        JOIN sets st ON st.session_exercise_id = se.id
        WHERE se.name = ${exerciseName}
          AND st.weight_kg IS NOT NULL
        GROUP BY s.date
        ORDER BY s.date ASC
      `);
    }

    res.json(
      rows.rows.map((r: Record<string, unknown>) => ({
        date: r["date"] as string,
        value: r["value"] as number,
      })),
    );
  } catch {
    res.status(500).json({ error: "Failed to fetch progress data" });
  }
});

export default router;
