import React from "react";
import { Plus, MoreVertical, Dumbbell } from "lucide-react";
import { AppLayout } from "./_shared/AppLayout";

export function Plans() {
  const plans = [
    { name: "Push Day A", exercises: 6, date: "Active", color: "bg-blue-500" },
    { name: "Pull Day", exercises: 5, date: "Active", color: "bg-purple-500" },
    { name: "Leg Day", exercises: 6, date: "Active", color: "bg-orange-500" },
    { name: "Upper Body", exercises: 8, date: "2 wks ago", color: "bg-zinc-600" },
    { name: "Full Body Beginner", exercises: 10, date: "1 mo ago", color: "bg-zinc-600" },
  ];

  return (
    <AppLayout activeTab="plans">
      <div className="px-6 pb-6 pt-4">
        <div className="flex items-end justify-between mb-8">
          <h1 className="power-dark-title text-4xl text-white uppercase tracking-wider m-0 leading-none">
            My Plans
          </h1>
          <button className="flex items-center gap-1 text-[#ccff00] font-bold text-sm tracking-wide">
            <Plus size={18} strokeWidth={3} /> NEW PLAN
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {plans.map((plan, i) => (
            <div key={i} className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${plan.color}/20 text-white`}>
                  <Dumbbell size={24} className={plan.color.replace('bg-', 'text-')} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">{plan.name}</h3>
                  <p className="text-zinc-500 text-sm font-medium mt-0.5">
                    {plan.exercises} exercises • {plan.date}
                  </p>
                </div>
              </div>
              <button className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-500 bg-[#27272a]/50">
                <MoreVertical size={20} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
