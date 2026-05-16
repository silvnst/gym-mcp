import { Link, useLocation } from "wouter";
import { Dumbbell, History, Play, Home } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Plans", icon: Home },
    { href: "/start", label: "Start", icon: Play },
    { href: "/history", label: "History", icon: History },
  ];

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center gap-4 px-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2 font-bold font-mono tracking-tight text-primary">
            <Dumbbell className="h-6 w-6" />
            <span className="hidden sm:inline-block">GYM TRACKER</span>
          </Link>
          <div className="flex-1" />
          <nav className="flex items-center gap-2 sm:gap-4">
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors rounded-md ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline-block">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="flex-1 container px-4 sm:px-8 py-6 sm:py-8 max-w-3xl mx-auto">
        {children}
      </main>
    </div>
  );
}
