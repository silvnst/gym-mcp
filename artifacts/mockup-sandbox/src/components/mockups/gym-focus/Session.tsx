import React from 'react';
import { Check, X, Plus } from 'lucide-react';
import './_group.css';

export function Session() {
  return (
    <div className="gym-focus-theme relative w-[390px] h-[844px] bg-white text-black flex flex-col border border-neutral-200 antialiased font-sans overflow-hidden">
      {/* Sticky Top Bar */}
      <header className="h-16 border-b-2 border-black px-4 flex items-center justify-between shrink-0 bg-white z-10">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-red-600 rounded-none animate-pulse" />
          <span className="font-black uppercase tracking-widest text-sm">Push Day A</span>
        </div>
        <button className="bg-black text-white px-5 h-10 text-xs font-black uppercase tracking-widest hover:bg-neutral-800">
          Finish
        </button>
      </header>

      <div className="flex-1 overflow-y-auto pb-32">
        <ExerciseBlock 
          num={1} 
          name="Bench Press" 
          target="4×8 @ 80kg"
          sets={[
            { id: 1, kg: '80', reps: '8', done: true },
            { id: 2, kg: '80', reps: '8', done: true },
            { id: 3, kg: '80', reps: '7', done: true },
            { id: 4, kg: '', reps: '', done: false },
          ]}
        />
        
        <ExerciseBlock 
          num={2} 
          name="Overhead Press" 
          target="3×10 @ 50kg"
          sets={[
            { id: 1, kg: '50', reps: '10', done: true },
            { id: 2, kg: '', reps: '', done: false },
            { id: 3, kg: '', reps: '', done: false },
          ]}
        />

        <ExerciseBlock 
          num={3} 
          name="Incline DB Press" 
          target="3×12 @ 30kg"
          sets={[
            { id: 1, kg: '', reps: '', done: false },
            { id: 2, kg: '', reps: '', done: false },
            { id: 3, kg: '', reps: '', done: false },
          ]}
        />

        <div className="px-4 mt-8">
          <button className="w-full h-14 border-2 border-dashed border-neutral-300 text-neutral-400 font-black tracking-widest uppercase text-xs flex items-center justify-center gap-2 hover:border-black hover:text-black transition-colors">
            <Plus className="w-5 h-5 stroke-[3]" /> Add Exercise
          </button>
        </div>
      </div>
    </div>
  );
}

function ExerciseBlock({ num, name, target, sets }: any) {
  return (
    <div className="border-b-2 border-black pb-6">
      <div className="px-4 py-5 bg-neutral-50/50">
        <div className="flex items-end gap-3 mb-3">
          <span className="font-mono-numbers text-2xl font-black">{num}.</span>
          <h2 className="text-2xl font-black tracking-tight leading-none uppercase">{name}</h2>
        </div>
        <div className="inline-block border border-black px-2 py-1 text-[10px] font-mono-numbers font-bold uppercase tracking-wider bg-white">
          Target: {target}
        </div>
      </div>
      
      <div className="px-4 py-2 bg-black text-white grid grid-cols-[40px_1fr_1fr_50px] gap-2 items-center mb-1">
        <div className="text-[10px] font-bold uppercase tracking-widest text-center">Set</div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-center">KG</div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-center">Reps</div>
        <div></div>
      </div>

      <div className="flex flex-col px-4 gap-2">
        {sets.map((set: any) => (
          <div key={set.id} className={`flex h-14 grid grid-cols-[40px_1fr_1fr_50px] gap-2 items-center transition-colors ${set.done ? 'bg-neutral-100' : ''}`}>
            <div className="font-mono-numbers text-sm text-center font-bold text-neutral-400">
              {set.id}
            </div>
            <div className="relative h-full py-1">
              <input 
                type="text" 
                inputMode="decimal"
                defaultValue={set.kg}
                placeholder="-"
                className={`w-full h-full text-center font-mono-numbers font-bold text-xl border focus:ring-2 focus:ring-black outline-none placeholder:text-neutral-300 ${set.done ? 'bg-transparent border-transparent' : 'bg-neutral-50 border-neutral-300'}`}
              />
            </div>
            <div className="relative h-full py-1">
              <input 
                type="text" 
                inputMode="numeric"
                defaultValue={set.reps}
                placeholder="-"
                className={`w-full h-full text-center font-mono-numbers font-bold text-xl border focus:ring-2 focus:ring-black outline-none placeholder:text-neutral-300 ${set.done ? 'bg-transparent border-transparent' : 'bg-neutral-50 border-neutral-300'}`}
              />
            </div>
            <div className="h-full py-1">
              <button className={`w-full h-full flex items-center justify-center border-2 transition-colors ${set.done ? 'bg-black text-white border-black' : 'border-neutral-200 text-neutral-300 hover:border-black hover:text-black'}`}>
                <Check className="w-6 h-6 stroke-[3]" />
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="px-4 py-4 flex items-center justify-center">
        <button className="h-10 px-4 text-xs font-black tracking-widest uppercase text-neutral-400 hover:text-black flex items-center gap-2">
          <Plus className="w-4 h-4 stroke-[3]" /> Add Set
        </button>
      </div>
    </div>
  );
}
