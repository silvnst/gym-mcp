import { AppLayout } from "./_shared/AppLayout";

const sessions = [
  { name: "Push Day A", date: "Mar 14, 2026", time: "5:30 PM" },
  { name: "Pull Day A", date: "Mar 12, 2026", time: "6:10 PM" },
  { name: "Legs", date: "Mar 10, 2026", time: "5:45 PM" },
  { name: "Push Day A", date: "Mar 7, 2026", time: "5:20 PM" },
];

export default function History() {
  return (
    <AppLayout activeTab="history">
      <h1
        className="text-2xl font-bold font-mono uppercase tracking-tight mb-1"
        style={{ color: "hsl(var(--primary))" }}
      >
        History
      </h1>
      <p className="text-sm mb-6" style={{ color: "hsl(var(--muted-fg))" }}>
        Your past sessions.
      </p>
      <div className="space-y-3">
        {sessions.map((s, i) => (
          <div
            key={i}
            className="rounded-lg border p-4"
            style={{
              borderColor: "hsl(var(--border))",
              background: "hsl(var(--card))",
            }}
          >
            <h3 className="font-bold">{s.name}</h3>
            <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-fg))" }}>
              {s.date} · {s.time}
            </p>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
