import { Play } from "lucide-react";
import { AppLayout } from "./_shared/AppLayout";

const plans = [
  { name: "Push Day A", exercises: 6 },
  { name: "Pull Day A", exercises: 5 },
  { name: "Legs", exercises: 4 },
];

export default function Start() {
  return (
    <AppLayout activeTab="start">
      <h1
        className="text-2xl font-bold font-mono uppercase tracking-tight mb-1"
        style={{ color: "hsl(var(--primary))" }}
      >
        Start Workout
      </h1>
      <p className="text-sm mb-6" style={{ color: "hsl(var(--muted-fg))" }}>
        Pick a plan or start empty.
      </p>

      <button
        className="w-full flex items-center justify-center gap-2 py-3 rounded-md font-medium mb-6"
        style={{
          background: "hsl(var(--primary))",
          color: "hsl(var(--primary-fg))",
        }}
      >
        <Play className="h-4 w-4" /> Start Empty Session
      </button>

      <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "hsl(var(--muted-fg))" }}>
        From Plan
      </h2>
      <div className="space-y-3">
        {plans.map((p) => (
          <div
            key={p.name}
            className="rounded-lg border p-4 flex items-center justify-between"
            style={{
              borderColor: "hsl(var(--border))",
              background: "hsl(var(--card))",
            }}
          >
            <div>
              <h3 className="font-bold">{p.name}</h3>
              <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-fg))" }}>
                {p.exercises} exercises
              </p>
            </div>
            <button
              className="h-9 px-3 rounded-md text-xs font-medium flex items-center gap-1"
              style={{
                background: "hsl(var(--primary))",
                color: "hsl(var(--primary-fg))",
              }}
            >
              <Play className="h-3.5 w-3.5" /> Start
            </button>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
