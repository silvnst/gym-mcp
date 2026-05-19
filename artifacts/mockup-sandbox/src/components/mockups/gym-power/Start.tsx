import React from "react";
import { Plus, Play } from "lucide-react";
import { AppLayout } from "./_shared/AppLayout";

export function Start() {
  const plans = [
    { name: "Push Day A", exercises: 6, lastPerformed: "Yesterday" },
    { name: "Pull Day", exercises: 5, lastPerformed: "3 days ago" },
    { name: "Leg Day", exercises: 6, lastPerformed: "4 days ago" },
  ];

  return (
    <AppLayout activeTab="start">
      <div className="px-6 pb-6 pt-4">
        <div className="mb-8">
          <h1 className="power-dark-title text-4xl text-white uppercase tracking-wider m-0 leading-none mb-2">
            Start Workout
          </h1>
          <p className="text-zinc-400 text-sm font-medium">Choose a plan or start an empty session.</p>
        </div>

        <button className="w-full h-16 bg-[#ccff00] text-black font-bold uppercase tracking-widest text-lg rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(204,255,0,0.15)] mb-10">
          <Plus size={24} strokeWidth={3} /> Empty Session
        </button>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-lg">From Plan</h2>
          <span className="text-zinc-500 text-sm font-medium">See all</span>
        </div>

        <div className="flex flex-col gap-3">
          {plans.map((plan, i) => (
            <div key={i} className="bg-[#18181b] border border-[#27272a] rounded-2xl p-1 pr-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button className="w-14 h-14 bg-[#27272a] text-[#ccff00] rounded-xl flex items-center justify-center">
                  <Play size={24} fill="currentColor" />
                </button>
                <div>
                  <h3 className="font-bold text-base text-white leading-tight">{plan.name}</h3>
                  <p className="text-zinc-500 text-xs font-medium mt-1">
                    {plan.exercises} exercises • Last: {plan.lastPerformed}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
