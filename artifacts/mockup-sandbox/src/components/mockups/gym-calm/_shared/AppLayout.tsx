import React from "react";
import { Dumbbell, Play, History, List } from "lucide-react";
import "../_group.css";


interface AppLayoutProps {
  children: React.ReactNode;
  activeTab: "plans" | "start" | "history";
}

export function AppLayout({ children, activeTab }: AppLayoutProps) {
  return (
    <div className="gym-calm h-[844px] w-[390px] mx-auto overflow-hidden relative border border-black/10 shadow-xl flex flex-col bg-[hsl(var(--bg-cream))]">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto gym-calm-scroll pb-24">
        {children}
      </div>

      {/* Bottom Tab Bar */}
      <div className="absolute bottom-0 w-full bg-[hsl(var(--card-cream))] border-t border-[hsl(var(--divider-gray))] px-6 py-4 flex justify-between items-center pb-8">
        <NavButton 
          icon={<List className="w-5 h-5" />} 
          label="Plans" 
          active={activeTab === "plans"} 
        />
        <NavButton 
          icon={<Play className="w-5 h-5" />} 
          label="Start" 
          active={activeTab === "start"} 
        />
        <NavButton 
          icon={<History className="w-5 h-5" />} 
          label="History" 
          active={activeTab === "history"} 
        />
      </div>
    </div>
  );
}

function NavButton({ icon, label, active }: { icon: React.ReactNode, label: string, active: boolean }) {
  return (
    <button className={`flex flex-col items-center justify-center gap-1 w-16 h-12 transition-colors ${active ? 'text-[hsl(var(--accent-orange))]' : 'text-[hsl(var(--text-muted))]'}`}>
      {icon}
      <span className="text-[10px] font-medium tracking-wide uppercase">{label}</span>
    </button>
  );
}
