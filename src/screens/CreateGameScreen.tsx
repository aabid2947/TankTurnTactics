import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Stepper } from "@/components/ui/stepper";
import { cn } from "@/lib/utils";

const PERIODS = ["5 min", "10 min", "30 min", "1 hr", "3 hr"];

export function CreateGameScreen() {
  const [name, setName] = useState("Friday Night Skirmish");
  const [period, setPeriod] = useState("10 min");
  const [ap, setAp] = useState(1);
  const [heart, setHeart] = useState(5);
  const [jury, setJury] = useState(3);
  const [board, setBoard] = useState(20);
  const [minP, setMinP] = useState(10);
  const [maxP, setMaxP] = useState(17);

  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-display text-3xl font-bold">Create a game</h1>
      <p className="text-sm text-muted-foreground">Tune the knobs — every value can be rebalanced after playtesting.</p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col">
            <SettingRow label="Game name">
              <Input value={name} onChange={(e) => setName(e.target.value)} className="max-w-[240px] font-sans" />
            </SettingRow>
            <SettingRow label="Period length" hint="Planning + chat window">
              <div className="flex flex-wrap justify-end gap-1.5">
                {PERIODS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={cn(
                      "rounded-full border-2 border-foreground px-2.5 py-1 font-mono text-[11px] font-bold",
                      period === p ? "bg-primary text-primary-foreground" : "bg-card",
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </SettingRow>
            <SettingRow label="AP per period" hint="Granted to living, non-haunted tanks">
              <Stepper value={ap} onChange={setAp} min={1} max={5} />
            </SettingRow>
            <SettingRow label="Heart spawn" hint="Every N periods">
              <Stepper value={heart} onChange={setHeart} min={1} max={20} />
            </SettingRow>
            <SettingRow label="Jury vote" hint="Every N periods">
              <Stepper value={jury} onChange={setJury} min={1} max={20} />
            </SettingRow>
            <SettingRow label="Board size" hint="Square grid">
              <Stepper value={board} onChange={setBoard} min={10} max={24} />
            </SettingRow>
            <SettingRow label="Min players">
              <Stepper value={minP} onChange={setMinP} min={2} max={maxP} />
            </SettingRow>
            <SettingRow label="Max players">
              <Stepper value={maxP} onChange={setMaxP} min={minP} max={17} />
            </SettingRow>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 font-mono text-xs">
              <SummaryRow k="Name" v={name} />
              <SummaryRow k="Period" v={period} />
              <SummaryRow k="AP / period" v={String(ap)} />
              <SummaryRow k="Heart spawn" v={`every ${heart}`} />
              <SummaryRow k="Jury vote" v={`every ${jury}`} />
              <SummaryRow k="Board" v={`${board}×${board}`} />
              <SummaryRow k="Players" v={`${minP}–${maxP}`} />
            </CardContent>
          </Card>
          <Button size="lg" className="w-full" asChild>
            <Link to="/waiting">
              <Rocket className="size-4" />
              Create &amp; open lobby
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function SettingRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
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

function SummaryRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-bold">{v}</span>
    </div>
  );
}
