import { useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowLeftRight, ArrowRight, ChevronsUp, Clock, Coins, Crosshair, Heart, Lock, Move, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { QUEUED_ACTIONS, YOU, type ActionType, type QueuedAction } from "@/lib/mock";

const ACTION_META: Record<ActionType, { icon: LucideIcon; label: string; cost: number }> = {
  heal: { icon: Heart, label: "Heal", cost: 3 },
  upgrade: { icon: ChevronsUp, label: "Upgrade", cost: 3 },
  trade: { icon: ArrowLeftRight, label: "Trade", cost: 0 },
  collect: { icon: Coins, label: "Collect", cost: 1 },
  move: { icon: Move, label: "Move", cost: 1 },
  shoot: { icon: Crosshair, label: "Shoot", cost: 1 },
};

// AP-spending actions live in the grid; "trade" is free + social and gets its own button.
const AP_ACTIONS: ActionType[] = ["heal", "upgrade", "collect", "move", "shoot"];

interface ActionQueuePanelProps {
  onProposeTrade?: () => void;
  onClose?: () => void;
  className?: string;
}

export function ActionQueuePanel({ onProposeTrade, onClose, className }: ActionQueuePanelProps) {
  const [queue, setQueue] = useState<QueuedAction[]>(QUEUED_ACTIONS);
  const idRef = useRef(100);

  const spent = queue.reduce((sum, a) => sum + a.cost, 0);
  const remaining = YOU.ap - spent;

  const add = (type: ActionType) => {
    const meta = ACTION_META[type];
    idRef.current += 1;
    setQueue((q) => [...q, { id: `a${idRef.current}`, type, label: `${meta.label} (demo)`, cost: meta.cost }]);
  };
  const remove = (id: string) => setQueue((q) => q.filter((a) => a.id !== id));

  return (
    <Card className={cn("flex h-full flex-col overflow-hidden p-0", className)}>
      <div className="flex items-center justify-between gap-2 border-b-2 border-foreground bg-primary-strong px-4 py-3 text-primary-foreground">
        <h3 className="font-display text-base font-bold">Action Queue</h3>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 font-mono text-sm font-bold tabular-nums">
            <Clock className="size-4" />
            04:12
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close action queue"
              className="grid size-7 place-items-center rounded-full border-2 border-foreground bg-card text-foreground shadow-brutal-sm transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between rounded-[10px] border-2 border-foreground bg-muted px-3 py-2">
          <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">AP available</span>
          <span className="inline-flex items-center gap-1 font-mono text-lg font-bold tabular-nums">
            <Coins className="size-4 text-ap" />
            {remaining}
            <span className="text-xs font-normal text-muted-foreground">/ {YOU.ap}</span>
          </span>
        </div>

        <ol className="flex flex-col gap-2">
          {queue.map((a, idx) => {
            const Icon = ACTION_META[a.type].icon;
            return (
              <li
                key={a.id}
                className="flex items-center gap-2 rounded-[10px] border-2 border-foreground bg-card px-2.5 py-2 shadow-brutal-sm"
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-full border-2 border-foreground bg-secondary font-mono text-[11px] font-bold text-secondary-foreground">
                  {idx + 1}
                </span>
                <Icon className="size-4 shrink-0" />
                <span className="flex-1 truncate font-mono text-xs">{a.label}</span>
                <span className="font-mono text-xs font-bold text-muted-foreground">-{a.cost}</span>
                <button onClick={() => remove(a.id)} className="text-muted-foreground hover:text-destructive" aria-label="Remove action">
                  <Trash2 className="size-4" />
                </button>
              </li>
            );
          })}
          {queue.length === 0 && (
            <li className="rounded-[10px] border-2 border-dashed border-foreground/30 px-3 py-6 text-center font-mono text-xs text-muted-foreground">
              No actions queued — add some below
            </li>
          )}
        </ol>

        <div className="flex flex-col gap-2">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Queue an action</span>
          <div className="grid grid-cols-3 gap-2">
            {AP_ACTIONS.map((type) => {
              const meta = ACTION_META[type];
              const Icon = meta.icon;
              return (
                <button
                  key={type}
                  onClick={() => add(type)}
                  className="flex flex-col items-center gap-1 rounded-[10px] border-2 border-foreground bg-card px-2 py-2 shadow-brutal-sm transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <Icon className="size-4" />
                  <span className="font-mono text-[10px] font-bold uppercase">{meta.label}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">-{meta.cost}</span>
                </button>
              );
            })}
          </div>

          {/* Trade is free + social — it pairs with DM negotiation, so it gets its own home. */}
          <button
            type="button"
            onClick={() => {
              add("trade");
              onProposeTrade?.();
            }}
            className="flex items-center gap-3 rounded-[10px] border-2 border-foreground bg-secondary px-3 py-2.5 text-secondary-foreground shadow-brutal-sm transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-foreground bg-card text-foreground">
              <ArrowLeftRight className="size-4" />
            </span>
            <span className="flex flex-col items-start leading-tight">
              <span className="font-display text-sm font-bold">Propose a trade</span>
              <span className="font-mono text-[10px] uppercase tracking-wide">Free · negotiate in DM</span>
            </span>
            <ArrowRight className="ml-auto size-4" />
          </button>
        </div>

        <div className="mt-auto flex flex-col gap-2">
          <p className="font-mono text-[10px] leading-snug text-muted-foreground">
            Locks at the buzzer · resolves heal → upgrade → trade → collect → move → shoot
          </p>
          <Button className="w-full" disabled={remaining < 0}>
            <Lock className="size-4" />
            Lock in {queue.length} action{queue.length === 1 ? "" : "s"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
