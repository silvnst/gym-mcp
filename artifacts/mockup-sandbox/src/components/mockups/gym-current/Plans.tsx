import { Plus, Trash2 } from "lucide-react";
import { AppLayout } from "./_shared/AppLayout";

const plans = [
  { name: "Push Day A", exercises: 6, date: "Mar 14, 2026" },
  { name: "Pull Day A", exercises: 5, date: "Mar 12, 2026" },
  { name: "Legs", exercises: 4, date: "Mar 10, 2026" },
];

export default function Plans() {
  return (
    <AppLayout activeTab="plans">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-2xl font-bold font-mono uppercase tracking-tight"
            style={{ color: "hsl(var(--primary))" }}
          >
            Your Plans
          </h1>
          <p className="text-sm" style={{ color: "hsl(var(--muted-fg))" }}>
            Manage your workout routines.
          </p>
        </div>
        <button
          className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium"
          style={{
            background: "hsl(var(--primary))",
            color: "hsl(var(--primary-fg))",
          }}
        >
          <Plus className="h-3.5 w-3.5" /> New
        </button>
      </div>
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
            <div className="min-w-0">
              <h3 className="font-bold truncate">{p.name}</h3>
              <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-fg))" }}>
                {p.exercises} exercises • {p.date}
              </p>
            </div>
            <Trash2 className="h-4 w-4" style={{ color: "hsl(var(--muted-fg))" }} />
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
