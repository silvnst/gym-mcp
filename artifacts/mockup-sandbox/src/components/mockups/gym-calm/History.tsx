import React from "react";
import { AppLayout } from "./_shared/AppLayout";

export function History() {
  const sessions = [
    { date: "Oct 24", name: "Push Day A", duration: "1h 12m", volume: "8,450 kg", exercises: 6 },
    { date: "Oct 22", name: "Leg Day", duration: "1h 35m", volume: "12,200 kg", exercises: 5 },
    { date: "Oct 20", name: "Pull Day", duration: "1h 05m", volume: "9,100 kg", exercises: 6 },
    { date: "Oct 18", name: "Push Day B", duration: "1h 15m", volume: "8,900 kg", exercises: 7 },
    { date: "Oct 15", name: "Leg Day", duration: "1h 40m", volume: "11,800 kg", exercises: 5 },
    { date: "Oct 13", name: "Full Body", duration: "1h 20m", volume: "10,500 kg", exercises: 8 },
  ];

  return (
    <AppLayout activeTab="history">
      <div className="px-6 py-12">
        <div className="mb-10">
          <h2 className="text-sm font-medium tracking-widest uppercase text-[hsl(var(--text-muted))] mb-1">Logbook</h2>
          <h1 className="text-4xl font-serif text-[hsl(var(--text-ink))]">History</h1>
        </div>

        <div className="space-y-6">
          {sessions.map((session, i) => (
            <div key={i} className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-12 pt-1 text-center">
                <div className="text-xs font-medium text-[hsl(var(--text-muted))] uppercase">{session.date.split(' ')[0]}</div>
                <div className="text-xl font-serif text-[hsl(var(--text-ink))]">{session.date.split(' ')[1]}</div>
              </div>
              
              <div className="flex-1 bg-[hsl(var(--card-cream))] border border-[hsl(var(--divider-gray))] p-4 rounded-sm">
                <h3 className="text-lg font-serif text-[hsl(var(--text-ink))] mb-2">{session.name}</h3>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[hsl(var(--text-muted))]">
                  <span>{session.duration}</span>
                  <span>•</span>
                  <span>{session.exercises} exercises</span>
                  <span>•</span>
                  <span>{session.volume}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 flex justify-between items-center text-sm font-medium text-[hsl(var(--text-ink))] border-t border-[hsl(var(--divider-gray))] pt-6">
          <button className="text-[hsl(var(--text-muted))] py-2 px-4 border border-[hsl(var(--divider-gray))] rounded-sm">Previous</button>
          <span>Page 1</span>
          <button className="py-2 px-4 border border-[hsl(var(--divider-gray))] rounded-sm bg-[hsl(var(--card-cream))]">Next</button>
        </div>
      </div>
    </AppLayout>
  );
}
