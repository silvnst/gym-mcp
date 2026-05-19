import React from 'react';
import { Home, Play, History as HistoryIcon } from 'lucide-react';
import '../_group.css';

export function AppLayout({ children, currentTab }: { children: React.ReactNode, currentTab: 'plans' | 'start' | 'history' }) {
  return (
    <div className="gym-focus-theme relative w-[390px] h-[844px] bg-white text-black overflow-hidden flex flex-col border border-neutral-200 antialiased font-sans">
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
      
      {/* Bottom Nav */}
      <nav className="h-[72px] border-t-2 border-black flex items-center justify-around px-2 bg-white shrink-0 pb-2">
        <NavItem active={currentTab === 'plans'} icon={<Home className="w-6 h-6 stroke-[2.5]" />} label="Plans" />
        <NavItem active={currentTab === 'start'} icon={<Play className="w-6 h-6 stroke-[2.5]" />} label="Start" />
        <NavItem active={currentTab === 'history'} icon={<HistoryIcon className="w-6 h-6 stroke-[2.5]" />} label="History" />
      </nav>
    </div>
  );
}

function NavItem({ active, icon, label }: { active: boolean, icon: React.ReactNode, label: string }) {
  return (
    <button className={`flex flex-col items-center justify-center gap-1 w-20 h-full transition-colors ${active ? 'text-black' : 'text-neutral-300'}`}>
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </button>
  );
}
