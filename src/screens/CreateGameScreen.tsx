import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { Rocket } from "lucide-react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Stepper } from "@/components/ui/stepper";
import { cn } from "@/lib/utils";

const PERIODS: { label: string; seconds: number }[] = [
  { label: "5 min", seconds: 300 },
  { label: "10 min", seconds: 600 },
  { label: "30 min", seconds: 1800 },
  { label: "1 hr", seconds: 3600 },
  { label: "3 hr", seconds: 10800 },
];

export function CreateGameScreen() {
  const createGame = useMutation(api.games.createGame);
  const navigate = useNavigate();
  const [name, setName] = useState("Friday Night Skirmish");
  const [periodSeconds, setPeriodSeconds] = useState(600);
  const [apPerGrant, setApPerGrant] = useState(1);
  const [heart, setHeart] = useState(5);
  const [jury, setJury] = useState(3);
  const [board, setBoard] = useState(20);
  const [minP, setMinP] = useState(10);
  const [maxP, setMaxP] = useState(17);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const id = await createGame({
        name,
        config: {
          periodSeconds,
          apPerGrant,
          heartSpawnEveryPeriods: heart,
          juryVoteEveryPeriods: jury,
          boardWidth: board,
          boardHeight: board,
          minPlayers: minP,
          maxPlayers: maxP,
        },
      });
      navigate(`/game/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create game");
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-display text-3xl font-bold">Create a game</h1>
      <p className="text-sm text-muted-foreground">Tune the knobs — every value can be rebalanced later.</p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col">
            <Row label="Game name">
              <Input value={name} onChange={(e) => setName(e.target.value)} className="max-w-[240px] font-sans" />
            </Row>
            <Row label="Period length" hint="Planning + chat window">
              <div className="flex flex-wrap justify-end gap-1.5">
                {PERIODS.map((p) => (
                  <button
                    key={p.seconds}
                    onClick={() => setPeriodSeconds(p.seconds)}
                    className={cn(
                      "rounded-full border-2 border-foreground px-2.5 py-1 font-mono text-[11px] font-bold",
                      periodSeconds === p.seconds ? "bg-primary text-primary-foreground" : "bg-card",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </Row>
            <Row label="AP per period">
              <Stepper value={apPerGrant} onChange={setApPerGrant} min={1} max={5} />
            </Row>
            <Row label="Heart spawn (periods)">
              <Stepper value={heart} onChange={setHeart} min={1} max={20} />
            </Row>
            <Row label="Jury vote (periods)">
              <Stepper value={jury} onChange={setJury} min={1} max={20} />
            </Row>
            <Row label="Board size">
              <Stepper value={board} onChange={setBoard} min={10} max={24} />
            </Row>
            <Row label="Min players">
              <Stepper value={minP} onChange={setMinP} min={1} max={maxP} />
            </Row>
            <Row label="Max players">
              <Stepper value={maxP} onChange={setMaxP} min={minP} max={17} />
            </Row>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 font-mono text-xs">
              <Sum k="Period" v={PERIODS.find((p) => p.seconds === periodSeconds)?.label ?? `${periodSeconds}s`} />
              <Sum k="AP / period" v={String(apPerGrant)} />
              <Sum k="Board" v={`${board}×${board}`} />
              <Sum k="Players" v={`${minP}–${maxP}`} />
            </CardContent>
          </Card>
          <Button size="lg" className="w-full" onClick={() => void submit()} disabled={busy}>
            <Rocket className="size-4" />
            {busy ? "Creating…" : "Create & open lobby"}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </div>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b-2 border-foreground/10 py-3 last:border-0">
      <div>
        <p className="font-mono text-xs font-bold uppercase tracking-wide">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Sum({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-bold">{v}</span>
    </div>
  );
}
