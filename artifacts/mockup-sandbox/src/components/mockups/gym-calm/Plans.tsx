import React from "react";
import { AppLayout } from "./_shared/AppLayout";
import { Plus, MoreHorizontal } from "lucide-react";

export function Plans() {
  const plans = [
    { name: "Push Day A", exercises: 6, date: "Oct 12, 2023" },
    { name: "Pull Day", exercises: 5, date: "Oct 14, 2023" },
    { name: "Leg Day", exercises: 5, date: "Oct 16, 2023" },
    { name: "Upper Body", exercises: 7, date: "Sep 22, 2023" },
    { name: "Full Body Beginner", exercises: 8, date: "Aug 05, 2023" },
  ];

  return (
    <AppLayout activeTab="plans">
      <div className="px-6 py-12">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-sm font-medium tracking-widest uppercase text-[hsl(var(--text-muted))] mb-1">Library</h2>
            <h1 className="text-4xl font-serif text-[hsl(var(--text-ink))]">Your Plans</h1>
          </div>
          <button className="h-10 w-10 rounded-full border border-[hsl(var(--divider-gray))] flex items-center justify-center text-[hsl(var(--text-ink))] hover:bg-[hsl(var(--divider-gray))] transition-colors">
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {plans.map((plan, i) => (
            <div key={i} className="group bg-[hsl(var(--card-cream))] border border-[hsl(var(--divider-gray))] p-5 rounded-sm hover:border-[hsl(var(--accent-orange))] transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-serif text-[hsl(var(--text-ink))] mb-1">{plan.name}</h3>
                  <p className="text-sm text-[hsl(var(--text-muted))]">{plan.exercises} exercises • Created {plan.date}</p>
                </div>
                <button className="text-[hsl(var(--text-muted))] p-1 h-8 w-8 flex items-center justify-center">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
