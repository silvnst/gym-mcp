import React from "react";
import { Home, Play, Clock, LayoutList } from "lucide-react";
import "../_group.css";

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab?: "plans" | "start" | "history" | "none";
  hideNav?: boolean;
}

export function AppLayout({ children, activeTab = "none", hideNav = false }: AppLayoutProps) {
  return (
    <div className="power-dark h-[844px] w-[390px] relative flex flex-col overflow-hidden border border-zinc-800 shadow-2xl rounded-[40px]">
      {/* Status bar spacer */}
      <div className="h-12 w-full shrink-0 flex items-center justify-between px-6 pt-2">
        <span className="text-[14px] font-medium">9:41</span>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 bg-white rounded-[2px]" />
          <div className="w-3 h-3 bg-white rounded-full" />
          <div className="w-5 h-2.5 border border-white rounded-[3px]" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-6 relative no-scrollbar">
        {children}
      </div>

      {!hideNav && (
        <div className="shrink-0 h-24 bg-[#09090b]/90 backdrop-blur-md border-t border-[#27272a] px-6 pb-8 pt-3 flex items-center justify-between relative z-50">
          <button className={`flex flex-col items-center gap-1 w-16 ${activeTab === "plans" ? "text-[#ccff00]" : "text-zinc-500"}`}>
            <LayoutList size={24} strokeWidth={activeTab === "plans" ? 2.5 : 2} />
            <span className="text-[10px] font-medium tracking-wide">Plans</span>
          </button>
          
          <button className="w-14 h-14 rounded-full bg-[#ccff00] text-black flex items-center justify-center -translate-y-5 shadow-[0_0_20px_rgba(204,255,0,0.3)] border-4 border-[#09090b]">
            <Play size={26} strokeWidth={3} className="ml-1" />
          </button>

          <button className={`flex flex-col items-center gap-1 w-16 ${activeTab === "history" ? "text-[#ccff00]" : "text-zinc-500"}`}>
            <Clock size={24} strokeWidth={activeTab === "history" ? 2.5 : 2} />
            <span className="text-[10px] font-medium tracking-wide">History</span>
          </button>
        </div>
      )}
    </div>
  );
}
