import React from "react";
import { AppLayout } from "./_shared/AppLayout";
import { Play } from "lucide-react";

export function Start() {
  const plans = [
    { name: "Push Day A", target: "Hypertrophy", last: "2 days ago" },
    { name: "Pull Day", target: "Strength", last: "4 days ago" },
    { name: "Leg Day", target: "Hypertrophy", last: "6 days ago" },
  ];

  return (
    <AppLayout activeTab="start">
      <div className="px-6 py-12">
        <div className="mb-10">
          <h2 className="text-sm font-medium tracking-widest uppercase text-[hsl(var(--text-muted))] mb-1">Train</h2>
          <h1 className="text-4xl font-serif text-[hsl(var(--text-ink))]">Start Workout</h1>
        </div>

        <button className="w-full bg-[hsl(var(--accent-orange))] text-[hsl(var(--bg-cream))] font-medium py-4 px-6 rounded-sm shadow-sm flex justify-between items-center mb-12">
          <span className="text-lg">Start Empty Session</span>
          <Play className="w-5 h-5 fill-current" />
        </button>

        <div>
          <h3 className="text-sm font-medium tracking-widest uppercase text-[hsl(var(--text-muted))] mb-4 border-b border-[hsl(var(--divider-gray))] pb-2">From Plan</h3>
          
          <div className="space-y-4 mt-6">
            {plans.map((plan, i) => (
              <div key={i} className="flex justify-between items-center bg-[hsl(var(--card-cream))] border border-[hsl(var(--divider-gray))] p-4 rounded-sm">
                <div>
                  <h4 className="text-lg font-serif text-[hsl(var(--text-ink))]">{plan.name}</h4>
                  <p className="text-sm text-[hsl(var(--text-muted))] mt-1">{plan.target} • Last: {plan.last}</p>
                </div>
                <button className="h-12 w-12 flex items-center justify-center rounded-full bg-[hsl(var(--bg-cream))] border border-[hsl(var(--divider-gray))] text-[hsl(var(--text-ink))]">
                  <Play className="w-5 h-5 ml-1" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
