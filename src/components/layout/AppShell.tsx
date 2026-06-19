import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { Crosshair, LogOut, Moon, Sun } from "lucide-react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { monogram } from "@/lib/board";

export function AppShell() {
  const { signOut } = useAuthActions();
  const viewer = useQuery(api.users.viewer);
  const [dark, setDark] = useState(false);
  const name = viewer?.name ?? viewer?.email ?? "You";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b-2 border-foreground bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-full border-2 border-foreground bg-primary text-primary-foreground shadow-brutal-sm">
              <Crosshair className="size-5" />
            </span>
            <span className="hidden font-display text-sm font-bold uppercase tracking-tight sm:block">
              Tank Turn Tactics
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => {
                const next = !dark;
                setDark(next);
                document.documentElement.classList.toggle("dark", next);
              }}
              className="grid size-9 place-items-center rounded-full border-2 border-foreground bg-card shadow-brutal-sm"
              aria-label="Toggle theme"
            >
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <Link
              to="/profile"
              className="grid size-9 place-items-center rounded-full border-2 border-foreground font-mono text-xs font-bold text-ink shadow-brutal-sm"
              style={{ backgroundColor: "#8B5CF6" }}
              title={`${name} — your profile & stats`}
            >
              {monogram(name)}
            </Link>
            <Button variant="outline" size="sm" onClick={() => void signOut()}>
              <LogOut className="size-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
