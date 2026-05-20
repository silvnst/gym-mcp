import React from "react";
import { Calendar, Timer, Activity, ChevronLeft, ChevronRight } from "lucide-react";
import { AppLayout } from "./_shared/AppLayout";

export function History() {
  const sessions = [
    { date: "Today", name: "Push Day A", duration: "1h 15m", volume: "8,450 kg", prs: 2 },
    { date: "Oct 12", name: "Pull Day", duration: "1h 05m", volume: "9,120 kg", prs: 1 },
    { date: "Oct 10", name: "Leg Day", duration: "1h 30m", volume: "12,400 kg", prs: 0 },
    { date: "Oct 8", name: "Upper Body", duration: "1h 10m", volume: "7,800 kg", prs: 3 },
    { date: "Oct 6", name: "Full Body Beginner", duration: "55m", volume: "5,200 kg", prs: 0 },
  ];

  return (
    <AppLayout activeTab="history">
      <div className="px-6 pb-6 pt-4">
        <div className="mb-8">
          <h1 className="power-dark-title text-4xl text-white uppercase tracking-wider m-0 leading-none mb-2">
            History
          </h1>
          <p className="text-zinc-400 text-sm font-medium">Past workouts and personal records.</p>
        </div>

        <div className="flex flex-col gap-4">
          {sessions.map((session, i) => (
            <div key={i} className="bg-[#18181b] border border-[#27272a] rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#27272a] flex items-center justify-between">
                <div className="flex items-center gap-2 text-zinc-400 font-medium text-xs uppercase tracking-wider">
                  <Calendar size={14} /> {session.date}
                </div>
                {session.prs > 0 && (
                  <div className="bg-[#ccff00]/20 text-[#ccff00] px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                    {session.prs} PRs
                  </div>
                )}
              </div>
              <div className="px-4 py-4">
                <h3 className="font-bold text-xl text-white mb-3">{session.name}</h3>
                
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Timer size={16} />
                    <span className="power-dark-num font-bold text-white text-sm">{session.duration}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Activity size={16} />
                    <span className="power-dark-num font-bold text-white text-sm">{session.volume}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-8 mb-4">
          <button className="w-10 h-10 rounded-full bg-[#18181b] border border-[#27272a] flex items-center justify-center text-zinc-400 disabled:opacity-50" disabled>
            <ChevronLeft size={20} />
          </button>
          <span className="text-zinc-500 font-medium text-sm">Page 1 of 12</span>
          <button className="w-10 h-10 rounded-full bg-[#18181b] border border-[#27272a] flex items-center justify-center text-white">
            <ChevronRight size={20} />
          </button>
        </div>

      </div>
    </AppLayout>
  );
}
