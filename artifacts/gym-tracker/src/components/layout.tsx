import { Link, useLocation } from "wouter";
import { List, Play, History, WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online-status";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const isOnline = useOnlineStatus();

  const navItems = [
    { href: "/", label: "Plans", icon: List, match: (l: string) => l === "/" || l.startsWith("/plans") },
    { href: "/start", label: "Start", icon: Play, match: (l: string) => l === "/start" || l.startsWith("/session") },
    { href: "/history", label: "History", icon: History, match: (l: string) => l.startsWith("/history") },
  ];

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      {!isOnline && (
        <div
          data-testid="banner-offline"
          className="flex items-center justify-center gap-2 bg-muted border-b border-border px-4 py-2 text-xs font-medium text-muted-foreground"
        >
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>No internet — changes will sync when reconnected.</span>
        </div>
      )}

      <main className="flex-1 w-full max-w-md mx-auto px-6 pt-10 pb-28 sm:pb-32">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
        <div
          className="max-w-md mx-auto px-6 flex justify-between items-center"
          style={{ paddingTop: "0.75rem", paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          {navItems.map((item) => {
            const isActive = item.match(location);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={`flex flex-col items-center justify-center gap-1 w-16 h-12 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium tracking-widest uppercase">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
