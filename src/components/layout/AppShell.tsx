import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Crosshair, Moon, Sun } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { YOU } from "@/lib/mock";
import { cn } from "@/lib/utils";

const NAV: { to: string; label: string; end?: boolean }[] = [
  { to: "/", label: "Home", end: true },
  { to: "/create", label: "Create" },
  { to: "/game", label: "Board" },
  { to: "/history", label: "History" },
  { to: "/profile", label: "Profile" },
  { to: "/screens", label: "Screens" },
];

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  return (
    <button
      onClick={() => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle("dark", next);
      }}
      className="grid size-9 place-items-center rounded-full border-2 border-foreground bg-card shadow-brutal-sm transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
      aria-label="Toggle theme"
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

export function AppShell() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b-2 border-foreground bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4">
          <NavLink to="/" className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-full border-2 border-foreground bg-primary text-primary-foreground shadow-brutal-sm">
              <Crosshair className="size-5" />
            </span>
            <span className="hidden font-display text-sm font-bold uppercase tracking-tight sm:block">Tank Turn Tactics</span>
            <Badge variant="secondary" className="hidden md:inline-flex">UI Demo</Badge>
          </NavLink>

          <nav className="ml-2 hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cn(
                    "rounded-[8px] px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wide transition-colors",
                    isActive ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted",
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <NavLink
              to="/profile"
              className="grid size-9 place-items-center rounded-full border-2 border-foreground font-mono text-xs font-bold text-ink shadow-brutal-sm"
              style={{ backgroundColor: YOU.color }}
            >
              {YOU.monogram}
            </NavLink>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
