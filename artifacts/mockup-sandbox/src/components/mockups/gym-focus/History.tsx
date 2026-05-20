import React from 'react';
import { AppLayout } from './_shared/AppLayout';
import './_group.css';

export function History() {
  const sessions = [
    { date: 'TODAY', name: 'Push Day A', duration: '1h 12m', volume: '8,450' },
    { date: 'OCT 24', name: 'Pull Day', duration: '58m', volume: '6,200' },
    { date: 'OCT 22', name: 'Leg Day', duration: '1h 30m', volume: '12,100' },
    { date: 'OCT 20', name: 'Upper Body', duration: '1h 05m', volume: '7,800' },
    { date: 'OCT 18', name: 'Full Body Beginner', duration: '45m', volume: '4,500' },
  ];

  return (
    <AppLayout currentTab="history">
      <div className="px-5 py-8">
        <div className="mb-10">
          <h1 className="text-3xl font-black tracking-tighter mb-2 uppercase">History</h1>
          <p className="text-sm text-neutral-500 font-bold uppercase tracking-widest">Training logbook</p>
        </div>
        
        <div className="flex flex-col gap-8">
          {sessions.map((session, i) => (
            <div key={i} className="border-2 border-black flex flex-col relative bg-white">
              <div className="absolute -top-3 left-4 bg-black text-white px-3 py-0.5 text-[10px] font-mono-numbers font-bold tracking-widest uppercase">
                {session.date}
              </div>
              <div className="p-5 pt-6">
                <h3 className="text-xl font-bold tracking-tight mb-4 uppercase">{session.name}</h3>
                <div className="grid grid-cols-2 gap-4 border-t-2 border-black pt-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Duration</span>
                    <span className="font-mono-numbers text-base font-bold">{session.duration}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Volume (KG)</span>
                    <span className="font-mono-numbers text-base font-bold">{session.volume}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 flex items-center justify-between border-t-2 border-black pt-6">
          <button className="h-11 px-4 text-xs font-black uppercase tracking-widest text-neutral-400 hover:text-black">Prev</button>
          <span className="font-mono-numbers text-sm font-bold">1 / 12</span>
          <button className="h-11 px-4 text-xs font-black uppercase tracking-widest text-black hover:bg-neutral-100">Next</button>
        </div>
      </div>
    </AppLayout>
  );
}
