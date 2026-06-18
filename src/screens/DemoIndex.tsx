import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";

const SCREENS = [
  { to: "/login", name: "Login", desc: "Email + password sign-in" },
  { to: "/signup", name: "Sign up", desc: "Create an account" },
  { to: "/", name: "Home / Lobby", desc: "Find or create games" },
  { to: "/create", name: "Create Game", desc: "Configure a match" },
  { to: "/waiting", name: "Waiting Room", desc: "Roster + invite code" },
  { to: "/game", name: "Board / In-game", desc: "Board, action queue, chat" },
  { to: "/history", name: "Game History", desc: "Matches + move log" },
  { to: "/results", name: "Results", desc: "Podium + final standings" },
  { to: "/profile", name: "Profile", desc: "Stats + match history" },
];

export function DemoIndex() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-3xl font-bold">Demo screens</h1>
        <p className="text-sm text-muted-foreground">
          Every screen in the UI demo, built from <span className="font-mono text-foreground">design.md</span>. Mock data, no backend.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SCREENS.map((s) => (
          <Link key={s.to + s.name} to={s.to}>
            <Card className="group h-full p-4 transition-transform hover:-translate-y-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-lg font-bold leading-tight">{s.name}</h3>
                <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
