import { Link, useLocation } from "wouter";
import { List, Play, History } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Plans", icon: List, match: (l: string) => l === "/" || l.startsWith("/plans") },
    { href: "/start", label: "Start", icon: Play, match: (l: string) => l === "/start" || l.startsWith("/session") },
    { href: "/history", label: "History", icon: History, match: (l: string) => l.startsWith("/history") },
  ];

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
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
