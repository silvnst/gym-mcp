import { Plus, X } from "lucide-react";
import { AppLayout } from "./_shared/AppLayout";

const exercises = [
  {
    name: "Bench Press",
    target: "4 × 8 @ 80kg",
    sets: [
      { n: 1, kg: 80, reps: 8 },
      { n: 2, kg: 80, reps: 8 },
      { n: 3, kg: 80, reps: 7 },
    ],
  },
  {
    name: "Overhead Press",
    target: "3 × 10 @ 40kg",
    sets: [
      { n: 1, kg: 40, reps: 10 },
      { n: 2, kg: 40, reps: 9 },
    ],
  },
];

export default function Session() {
  return (
    <AppLayout activeTab="start">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-xl font-bold font-mono uppercase tracking-tight"
            style={{ color: "hsl(var(--primary))" }}
          >
            Push Day A
          </h1>
          <p className="text-xs" style={{ color: "hsl(var(--muted-fg))" }}>
            Mar 14, 2026 · 5:30 PM
          </p>
        </div>
        <button
          className="px-3 py-2 rounded-md text-xs font-semibold"
          style={{
            background: "hsl(var(--primary))",
            color: "hsl(var(--primary-fg))",
          }}
        >
          Finish
        </button>
      </div>

      <div className="space-y-6">
        {exercises.map((ex) => (
          <div
            key={ex.name}
            className="rounded-lg border p-4"
            style={{
              borderColor: "hsl(var(--border))",
              background: "hsl(var(--card))",
            }}
          >
            <h3 className="font-bold">{ex.name}</h3>
            <p className="text-xs mb-3" style={{ color: "hsl(var(--muted-fg))" }}>
              Target: {ex.target}
            </p>
            <div className="space-y-1.5">
              <div
                className="grid grid-cols-[2rem_1fr_1fr_1.5rem] gap-2 text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: "hsl(var(--muted-fg))" }}
              >
                <div className="text-center">Set</div>
                <div className="text-center">kg</div>
                <div className="text-center">Reps</div>
                <div></div>
              </div>
              {ex.sets.map((s) => (
                <div
                  key={s.n}
                  className="grid grid-cols-[2rem_1fr_1fr_1.5rem] gap-2 items-center"
                >
                  <div className="text-center text-sm font-medium">{s.n}</div>
                  <input
                    className="h-9 text-center border rounded-md text-sm"
                    style={{ borderColor: "hsl(var(--border))" }}
                    defaultValue={s.kg}
                  />
                  <input
                    className="h-9 text-center border rounded-md text-sm"
                    style={{ borderColor: "hsl(var(--border))" }}
                    defaultValue={s.reps}
                  />
                  <X className="h-3.5 w-3.5 mx-auto" style={{ color: "hsl(var(--muted-fg))" }} />
                </div>
              ))}
              <button
                className="mt-2 text-xs font-medium flex items-center gap-1 mx-auto"
                style={{ color: "hsl(var(--primary))" }}
              >
                <Plus className="h-3 w-3" /> Add Set
              </button>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
