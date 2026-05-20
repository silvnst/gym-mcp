import React from "react";
import { Dumbbell, Play, History, Home } from "lucide-react";
import "../_group.css";

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab: "plans" | "start" | "history";
}

export function AppLayout({ children, activeTab }: AppLayoutProps) {
  const navItems = [
    { key: "plans", label: "Plans", icon: Home },
    { key: "start", label: "Start", icon: Play },
    { key: "history", label: "History", icon: History },
  ] as const;

  return (
    <div
      className="gym-current h-[844px] w-[390px] mx-auto overflow-hidden relative border border-black/10 shadow-xl flex flex-col"
      style={{ background: "hsl(var(--bg))" }}
    >
      <header
        className="sticky top-0 z-50 w-full border-b backdrop-blur"
        style={{
          borderColor: "hsl(var(--border))",
          background: "hsla(0 0% 100% / 0.85)",
        }}
      >
        <div className="flex h-14 items-center gap-3 px-4">
          <div
            className="flex items-center gap-2 font-bold font-mono tracking-tight"
            style={{ color: "hsl(var(--primary))" }}
          >
            <Dumbbell className="h-6 w-6" />
            <span className="text-sm">GYM TRACKER</span>
          </div>
          <div className="flex-1" />
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.key === activeTab;
              return (
                <div
                  key={item.key}
                  className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium rounded-md"
                  style={
                    active
                      ? {
                          background: "hsl(var(--primary))",
                          color: "hsl(var(--primary-fg))",
                        }
                      : { color: "hsl(var(--muted-fg))" }
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto gym-current-scroll px-4 py-6">
        {children}
      </main>
    </div>
  );
}
