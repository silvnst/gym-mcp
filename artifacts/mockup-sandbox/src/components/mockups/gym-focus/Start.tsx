import React from 'react';
import { AppLayout } from './_shared/AppLayout';
import { Play } from 'lucide-react';
import './_group.css';

export function Start() {
  const plans = [
    { name: 'Push Day A', count: 6 },
    { name: 'Pull Day', count: 7 },
    { name: 'Leg Day', count: 5 },
    { name: 'Upper Body', count: 8 },
  ];

  return (
    <AppLayout currentTab="start">
      <div className="px-5 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tighter uppercase mb-2">Start</h1>
          <p className="text-sm text-neutral-500 font-bold uppercase tracking-widest">Choose a plan or go empty</p>
        </div>
        
        <button className="w-full bg-black text-white h-16 font-black tracking-widest uppercase mb-12 flex items-center justify-center gap-2 hover:bg-neutral-800 active:bg-black">
          Start Empty Session
        </button>

        <h2 className="text-xs font-black tracking-widest text-black mb-4 uppercase flex items-center gap-3">
          From Plan
          <div className="flex-1 h-px bg-black"></div>
        </h2>
        <div className="flex flex-col">
          {plans.map((plan, i) => (
            <div key={i} className="flex items-center justify-between py-5 border-b border-neutral-200">
              <div>
                <h3 className="text-xl font-bold tracking-tight leading-none mb-1.5">{plan.name}</h3>
                <div className="font-mono-numbers font-bold text-xs text-neutral-500 uppercase tracking-widest">
                  {plan.count} EXERCISES
                </div>
              </div>
              <button className="flex items-center justify-center w-12 h-12 border-2 border-black hover:bg-black hover:text-white transition-colors">
                <Play className="w-5 h-5 fill-current stroke-[2]" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
