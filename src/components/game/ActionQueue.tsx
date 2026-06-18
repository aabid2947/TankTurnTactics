import type { LucideIcon } from "lucide-react";
import { ChevronsUp, Coins, Crosshair, Gift, Heart, Lock, Move, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { queueCost, type QueuedKind } from "@convex/lib/cost";
import type { Id } from "@convex/_generated/dataModel";
import type { MyPlayer, QueueRow } from "@/lib/gameTypes";

type Mode = "move" | "shoot" | "give" | null;

const KIND_ICON: Record<string, LucideIcon> = {
  move: Move,
  shoot: Crosshair,
  heal: Heart,
  upgrade: ChevronsUp,
  collect: Coins,
  give: Gift,
};

function actionLabel(row: QueueRow, nameOf: (id: string) => string): string {
  const a = row.action;
  switch (a.kind) {
    case "move":
      return `Move → (${a.to.x}, ${a.to.y})`;
    case "shoot":
      return `Shoot ⌖ (${a.target.x}, ${a.target.y})`;
    case "heal":
      return "Heal (+1 heart)";
    case "upgrade":
      return "Upgrade range";
    case "collect":
      return "Collect AP";
    case "give":
      return `Give ♥ → ${nameOf(a.targetId)}`;
  }
}

interface Props {
  me?: MyPlayer;
  queue: QueueRow[];
  mode: Mode;
  setMode: (m: Mode) => void;
  disabled: boolean;
  nameOf: (id: string) => string;
  onSimple: (kind: "heal" | "upgrade" | "collect") => void;
  onCancel: (id: Id<"queuedActions">) => void;
  onClear: () => void;
}

export function ActionQueue({ me, queue, mode, setMode, disabled, nameOf, onSimple, onCancel, onClear }: Props) {
  const ap = me?.ap ?? 0;
  const range = me?.range ?? 1;
  const spent = queueCost(queue.map((r) => r.action.kind) as QueuedKind[], range);
  const remaining = ap - spent;
  const toggle = (m: "move" | "shoot" | "give") => setMode(mode === m ? null : m);

  return (
    <Card className="flex h-full flex-col overflow-hidden p-0">
      <div className="flex items-center justify-between border-b-2 border-foreground bg-primary px-4 py-3 text-primary-foreground">
        <h3 className="font-display text-base font-bold">Action Queue</h3>
        <span className="inline-flex items-center gap-1 font-mono text-sm font-bold tabular-nums">
          <Coins className="size-4" />
          {remaining}
          <span className="text-xs font-normal opacity-80">/ {ap}</span>
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <ol className="flex flex-col gap-2">
          {queue.map((row, idx) => {
            const Icon = KIND_ICON[row.action.kind] ?? Move;
            return (
              <li key={row._id} className="flex items-center gap-2 rounded-[10px] border-2 border-foreground bg-card px-2.5 py-2 shadow-brutal-sm">
                <span className="grid size-6 shrink-0 place-items-center rounded-full border-2 border-foreground bg-secondary font-mono text-[11px] font-bold text-secondary-foreground">
                  {idx + 1}
                </span>
                <Icon className="size-4 shrink-0" />
                <span className="flex-1 truncate font-mono text-xs">{actionLabel(row, nameOf)}</span>
                <button onClick={() => onCancel(row._id)} className="text-muted-foreground hover:text-destructive" aria-label="Cancel action">
                  <Trash2 className="size-4" />
                </button>
              </li>
            );
          })}
          {queue.length === 0 && (
            <li className="rounded-[10px] border-2 border-dashed border-foreground/30 px-3 py-6 text-center font-mono text-xs text-muted-foreground">
              No actions queued — add some below.
            </li>
          )}
        </ol>

        <div className="grid grid-cols-2 gap-2">
          <Button variant={mode === "move" ? "default" : "outline"} size="sm" disabled={disabled} onClick={() => toggle("move")}>
            <Move className="size-4" />
            Move
          </Button>
          <Button variant={mode === "shoot" ? "destructive" : "outline"} size="sm" disabled={disabled} onClick={() => toggle("shoot")}>
            <Crosshair className="size-4" />
            Shoot
          </Button>
          <Button variant={mode === "give" ? "accent" : "outline"} size="sm" disabled={disabled} onClick={() => toggle("give")}>
            <Gift className="size-4" />
            Give
          </Button>
          <Button variant="outline" size="sm" disabled={disabled} onClick={() => onSimple("heal")}>
            <Heart className="size-4" />
            Heal
          </Button>
          <Button variant="outline" size="sm" disabled={disabled} onClick={() => onSimple("upgrade")}>
            <ChevronsUp className="size-4" />
            Upgrade
          </Button>
          <Button variant="outline" size="sm" disabled={disabled} onClick={() => onSimple("collect")}>
            <Coins className="size-4" />
            Collect
          </Button>
          <Button variant="ghost" size="sm" className="col-span-2" disabled={disabled || queue.length === 0} onClick={onClear}>
            <Trash2 className="size-4" />
            Clear queue
          </Button>
        </div>

        <div className="mt-auto flex items-center gap-2 rounded-[10px] border-2 border-foreground bg-muted px-3 py-2 font-mono text-[10px] leading-snug text-muted-foreground">
          <Lock className="size-3.5 shrink-0" />
          Locks at the buzzer · heal → upgrade → give → collect → move → shoot, ties by who queued first.
        </div>
      </div>
    </Card>
  );
}
