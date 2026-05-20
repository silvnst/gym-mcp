import React, { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import "./_group.css";

export function Session() {
  return (
    <div className="gym-calm h-[844px] w-[390px] mx-auto overflow-hidden relative border border-black/10 shadow-xl flex flex-col bg-[hsl(var(--bg-cream))]">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-[hsl(var(--bg-cream))] border-b border-[hsl(var(--divider-gray))] px-6 py-4 flex justify-between items-center shadow-sm">
        <div>
          <h2 className="text-xs font-medium tracking-widest uppercase text-[hsl(var(--accent-orange))] mb-0.5">Active</h2>
          <h1 className="text-xl font-serif font-medium">Push Day A</h1>
        </div>
        <button className="bg-[hsl(var(--text-ink))] text-[hsl(var(--bg-cream))] px-5 py-2.5 rounded-sm text-sm font-medium">
          Finish
        </button>
      </div>

      <div className="flex-1 overflow-y-auto gym-calm-scroll px-6 py-8 space-y-12 pb-32">
        <ExerciseBlock 
          num={1}
          name="Bench Press" 
          target="4 × 8 @ 80kg"
          sets={[
            { id: 1, kg: "80", reps: "8", completed: true },
            { id: 2, kg: "80", reps: "8", completed: true },
            { id: 3, kg: "80", reps: "6", completed: true },
            { id: 4, kg: "80", reps: "", completed: false },
          ]}
        />

        <ExerciseBlock 
          num={2}
          name="Incline DB Press" 
          target="3 × 10 @ 30kg"
          sets={[
            { id: 1, kg: "30", reps: "10", completed: false },
            { id: 2, kg: "30", reps: "", completed: false },
            { id: 3, kg: "", reps: "", completed: false },
          ]}
        />

        <ExerciseBlock 
          num={3}
          name="Overhead Press" 
          target="3 × 8 @ 50kg"
          sets={[
            { id: 1, kg: "", reps: "", completed: false },
            { id: 2, kg: "", reps: "", completed: false },
            { id: 3, kg: "", reps: "", completed: false },
          ]}
        />

        <button className="w-full py-4 border border-dashed border-[hsl(var(--text-muted))] text-[hsl(var(--text-ink))] rounded-sm font-medium flex justify-center items-center gap-2">
          <Plus className="w-4 h-4" /> Add Exercise
        </button>
      </div>
    </div>
  );
}

function ExerciseBlock({ num, name, target, sets }: { num: number, name: string, target: string, sets: any[] }) {
  return (
    <div>
      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-serif text-[hsl(var(--text-muted))]">{num}.</span>
          <h3 className="text-2xl font-serif">{name}</h3>
        </div>
        <p className="text-sm text-[hsl(var(--accent-orange))] font-medium mt-1">{target}</p>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-[3rem_1fr_1fr_3rem] gap-2 px-2 text-xs font-medium text-[hsl(var(--text-muted))] tracking-widest uppercase mb-2">
          <div className="text-center">Set</div>
          <div className="text-center">kg</div>
          <div className="text-center">Reps</div>
          <div></div>
        </div>

        {sets.map((set, i) => (
          <div key={set.id} className={`grid grid-cols-[3rem_1fr_1fr_3rem] gap-2 items-center p-2 rounded-sm transition-colors ${set.completed ? 'bg-[hsl(var(--card-cream))]' : ''}`}>
            <div className="text-center text-sm font-medium font-serif">{i + 1}</div>
            
            <input 
              type="text"
              inputMode="decimal"
              defaultValue={set.kg}
              placeholder="-"
              className={`h-11 w-full text-center text-lg bg-transparent border-b ${set.completed ? 'border-transparent text-[hsl(var(--text-ink))] font-medium' : 'border-[hsl(var(--divider-gray))] text-[hsl(var(--text-ink))] focus:border-[hsl(var(--accent-orange))]'} outline-none transition-colors`}
            />
            
            <input 
              type="text"
              inputMode="numeric"
              defaultValue={set.reps}
              placeholder="-"
              className={`h-11 w-full text-center text-lg bg-transparent border-b ${set.completed ? 'border-transparent text-[hsl(var(--text-ink))] font-medium' : 'border-[hsl(var(--divider-gray))] text-[hsl(var(--text-ink))] focus:border-[hsl(var(--accent-orange))]'} outline-none transition-colors`}
            />
            
            <button className="h-11 w-full flex items-center justify-center text-[hsl(var(--text-muted))]">
              {set.completed ? (
                <div className="h-6 w-6 rounded-full bg-[hsl(var(--accent-orange))] flex items-center justify-center text-[hsl(var(--bg-cream))]">
                  <Check className="w-3.5 h-3.5" />
                </div>
              ) : (
                <div className="h-6 w-6 rounded-full border border-[hsl(var(--divider-gray))] flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 opacity-20" />
                </div>
              )}
            </button>
          </div>
        ))}
        
        <button className="mt-4 text-sm font-medium text-[hsl(var(--text-muted))] flex items-center gap-1 mx-auto py-2 px-4">
          <Plus className="w-4 h-4" /> Add Set
        </button>
      </div>
    </div>
  );
}
