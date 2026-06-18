import { Coins, Crosshair, Heart, Skull, Users } from "lucide-react";
import { ActionQueuePanel } from "@/components/game/ActionQueuePanel";
import { BoardGrid } from "@/components/game/BoardGrid";
import { ChatPanel } from "@/components/game/ChatPanel";
import { HudChip } from "@/components/game/HudChip";
import { Progress } from "@/components/ui/progress";
import { YOU } from "@/lib/mock";

export function GameScreen() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-[var(--radius)] border-2 border-foreground bg-card p-4 shadow-brutal lg:flex-row lg:items-center">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-[10px] border-2 border-foreground bg-secondary font-mono text-lg font-bold tabular-nums text-secondary-foreground shadow-brutal-sm">
            04:12
          </span>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Period 12 · resolving soon</p>
            <p className="font-display text-sm font-bold">Plan your moves &amp; chat</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:ml-auto">
          <HudChip icon={Coins} label="AP" value={YOU.ap} tone="ap" />
          <HudChip icon={Crosshair} label="Range" value={YOU.range} tone="range" />
          <HudChip icon={Heart} label="Hearts" value={`${YOU.hearts}/3`} tone="heart" />
          <HudChip icon={Users} label="Alive" value="6/8" />
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-[var(--radius)] border-2 border-foreground bg-card px-4 py-3 shadow-brutal-sm">
        <Skull className="size-4 shrink-0 text-muted-foreground" />
        <Progress value={62} className="flex-1" barClassName="bg-secondary" />
        <span className="shrink-0 font-mono text-xs font-bold">3 to win</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)_330px]">
        <div className="order-2 lg:order-1 lg:h-[560px]">
          <ActionQueuePanel />
        </div>
        <div className="order-1 lg:order-2">
          <BoardGrid />
        </div>
        <div className="order-3 h-[520px] lg:order-3 lg:h-[560px]">
          <ChatPanel />
        </div>
      </div>
    </div>
  );
}
