import React from "react";
import { Check, Plus, Trash2, Clock, Play } from "lucide-react";
import { AppLayout } from "./_shared/AppLayout";

export function Session() {
  return (
    <AppLayout hideNav>
      {/* Sticky Top Bar */}
      <div className="sticky top-0 z-50 bg-[#09090b]/95 backdrop-blur-xl border-b border-[#27272a] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#18181b] border border-[#27272a] flex items-center justify-center text-[#ccff00]">
            <Clock size={20} />
          </div>
          <div>
            <h2 className="power-dark-title text-2xl text-white uppercase leading-none tracking-wide">Push Day A</h2>
            <p className="power-dark-num text-[#ccff00] text-sm leading-none mt-1">42:15</p>
          </div>
        </div>
        <button className="h-11 px-6 bg-[#ccff00] text-black font-bold uppercase tracking-wider text-sm rounded-xl">
          Finish
        </button>
      </div>

      <div className="px-4 py-6 flex flex-col gap-8">
        
        {/* Exercise 1 */}
        <div>
          <div className="mb-4">
            <h3 className="text-xl font-bold text-white mb-2">1. Barbell Bench Press</h3>
            <div className="inline-flex items-center px-3 py-1 bg-[#18181b] border border-[#27272a] rounded-lg text-sm text-zinc-400 font-medium">
              Target: <span className="text-white ml-1">4×8 @ 80kg</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[3rem_1fr_1fr_3rem] gap-2 px-2 pb-2 text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-[#27272a]">
              <div className="text-center">Set</div>
              <div className="text-center">kg</div>
              <div className="text-center">Reps</div>
              <div className="text-center"></div>
            </div>

            {/* Set 1: Completed */}
            <div className="grid grid-cols-[3rem_1fr_1fr_3rem] gap-2 items-center bg-[#ccff00]/10 border border-[#ccff00]/30 rounded-xl p-1">
              <div className="h-11 flex items-center justify-center power-dark-num text-[#ccff00] font-bold">1</div>
              <input type="text" inputMode="decimal" defaultValue="80" className="h-11 bg-transparent text-center power-dark-num text-xl text-white font-bold outline-none" />
              <input type="text" inputMode="numeric" defaultValue="8" className="h-11 bg-transparent text-center power-dark-num text-xl text-white font-bold outline-none" />
              <button className="h-11 flex items-center justify-center text-[#ccff00]">
                <div className="w-7 h-7 rounded bg-[#ccff00] flex items-center justify-center text-black">
                  <Check size={18} strokeWidth={3} />
                </div>
              </button>
            </div>

            {/* Set 2: Completed */}
            <div className="grid grid-cols-[3rem_1fr_1fr_3rem] gap-2 items-center bg-[#ccff00]/10 border border-[#ccff00]/30 rounded-xl p-1">
              <div className="h-11 flex items-center justify-center power-dark-num text-[#ccff00] font-bold">2</div>
              <input type="text" inputMode="decimal" defaultValue="80" className="h-11 bg-transparent text-center power-dark-num text-xl text-white font-bold outline-none" />
              <input type="text" inputMode="numeric" defaultValue="8" className="h-11 bg-transparent text-center power-dark-num text-xl text-white font-bold outline-none" />
              <button className="h-11 flex items-center justify-center text-[#ccff00]">
                <div className="w-7 h-7 rounded bg-[#ccff00] flex items-center justify-center text-black">
                  <Check size={18} strokeWidth={3} />
                </div>
              </button>
            </div>

            {/* Set 3: Active/Empty */}
            <div className="grid grid-cols-[3rem_1fr_1fr_3rem] gap-2 items-center bg-[#18181b] border border-[#27272a] rounded-xl p-1">
              <div className="h-11 flex items-center justify-center power-dark-num text-zinc-500 font-bold">3</div>
              <input type="text" inputMode="decimal" placeholder="80" className="h-11 bg-[#27272a]/50 rounded-lg text-center power-dark-num text-xl text-white font-bold outline-none placeholder:text-zinc-600 focus:bg-[#27272a]" />
              <input type="text" inputMode="numeric" placeholder="8" className="h-11 bg-[#27272a]/50 rounded-lg text-center power-dark-num text-xl text-white font-bold outline-none placeholder:text-zinc-600 focus:bg-[#27272a]" />
              <button className="h-11 flex items-center justify-center text-zinc-600">
                <Trash2 size={18} />
              </button>
            </div>

            <button className="h-11 mt-2 flex items-center justify-center gap-2 text-sm font-bold text-zinc-400 bg-[#18181b] border border-[#27272a] border-dashed rounded-xl uppercase tracking-wider">
              <Plus size={18} /> Add Set
            </button>
          </div>
        </div>

        {/* Exercise 2 */}
        <div>
          <div className="mb-4">
            <h3 className="text-xl font-bold text-white mb-2">2. Incline DB Press</h3>
            <div className="inline-flex items-center px-3 py-1 bg-[#18181b] border border-[#27272a] rounded-lg text-sm text-zinc-400 font-medium">
              Target: <span className="text-white ml-1">3×10 @ 32kg</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[3rem_1fr_1fr_3rem] gap-2 px-2 pb-2 text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-[#27272a]">
              <div className="text-center">Set</div>
              <div className="text-center">kg</div>
              <div className="text-center">Reps</div>
              <div className="text-center"></div>
            </div>

            {/* Set 1: Empty */}
            <div className="grid grid-cols-[3rem_1fr_1fr_3rem] gap-2 items-center bg-[#18181b] border border-[#27272a] rounded-xl p-1">
              <div className="h-11 flex items-center justify-center power-dark-num text-zinc-500 font-bold">1</div>
              <input type="text" inputMode="decimal" placeholder="32" className="h-11 bg-[#27272a]/50 rounded-lg text-center power-dark-num text-xl text-white font-bold outline-none placeholder:text-zinc-600 focus:bg-[#27272a]" />
              <input type="text" inputMode="numeric" placeholder="10" className="h-11 bg-[#27272a]/50 rounded-lg text-center power-dark-num text-xl text-white font-bold outline-none placeholder:text-zinc-600 focus:bg-[#27272a]" />
              <button className="h-11 flex items-center justify-center text-[#27272a]">
                <div className="w-7 h-7 rounded bg-[#27272a] flex items-center justify-center text-white/50">
                  <Check size={18} strokeWidth={3} />
                </div>
              </button>
            </div>
          </div>
        </div>

        <button className="h-14 w-full bg-[#18181b] border border-[#27272a] text-[#ccff00] font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2">
          <Plus size={20} /> Add Exercise
        </button>

      </div>
    </AppLayout>
  );
}
