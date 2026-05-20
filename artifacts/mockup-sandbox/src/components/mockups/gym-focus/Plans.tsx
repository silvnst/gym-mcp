import React from 'react';
import { AppLayout } from './_shared/AppLayout';
import { Plus, MoreHorizontal } from 'lucide-react';
import './_group.css';

export function Plans() {
  const plans = [
    { name: 'Push Day A', count: 6, date: 'Oct 12' },
    { name: 'Pull Day', count: 7, date: 'Oct 14' },
    { name: 'Leg Day', count: 5, date: 'Oct 16' },
    { name: 'Upper Body', count: 8, date: 'Oct 20' },
    { name: 'Full Body Beginner', count: 5, date: 'Nov 02' },
  ];

  return (
    <AppLayout currentTab="plans">
      <div className="px-5 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black tracking-tighter uppercase">Plans</h1>
          <button className="flex items-center justify-center w-11 h-11 border-2 border-black rounded-none hover:bg-black hover:text-white transition-colors">
            <Plus className="w-6 h-6 stroke-[3]" />
          </button>
        </div>
        
        <div className="flex flex-col border-t-2 border-black">
          {plans.map((plan, i) => (
            <div key={i} className="flex items-center justify-between py-5 border-b border-neutral-300">
              <div>
                <h3 className="text-xl font-bold tracking-tight leading-none mb-2">{plan.name}</h3>
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-mono-numbers font-bold text-neutral-500 uppercase tracking-widest">{plan.count} Exercises</span>
                  <span className="text-neutral-300">&middot;</span>
                  <span className="font-mono-numbers font-bold text-neutral-400 uppercase tracking-widest">{plan.date}</span>
                </div>
              </div>
              <button className="p-2 text-neutral-300 hover:text-black transition-colors w-11 h-11 flex items-center justify-center">
                <MoreHorizontal className="w-6 h-6 stroke-[2.5]" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
