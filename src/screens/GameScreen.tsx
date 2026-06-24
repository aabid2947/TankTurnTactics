import { useEffect, useRef, useState } from "react";
import {
  Coins,
  Crosshair,
  Heart,
  ListChecks,
  type LucideIcon,
  Maximize2,
  MessageSquare,
  Minimize2,
  Skull,
  Users,
} from "lucide-react";
import { ActionQueuePanel } from "@/components/game/ActionQueuePanel";
import { BoardScene3D } from "@/components/game/BoardScene3D";
import { ChatPanel } from "@/components/game/ChatPanel";
import { Drawer } from "@/components/game/Drawer";
import { HudChip } from "@/components/game/HudChip";
import { useKiosk } from "@/components/game/useKiosk";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { YOU } from "@/lib/mock";
import { cn } from "@/lib/utils";

type ChatTab = "global" | "dm";

export function GameScreen() {
  const { kiosk, enter, exit, targetRef } = useKiosk();
  const [queueOpen, setQueueOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatTab, setChatTab] = useState<ChatTab>("global");
  const focusBtnRef = useRef<HTMLButtonElement>(null);
  const mounted = useRef(false);

  // Return focus to the trigger after leaving focus mode.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (!kiosk) focusBtnRef.current?.focus();
  }, [kiosk]);

  const proposeTrade = () => {
    setChatTab("dm");
    setChatOpen(true);
  };

  const chips = (
    <>
      <HudChip icon={Coins} label="AP" value={YOU.ap} tone="ap" />
      <HudChip icon={Crosshair} label="Range" value={YOU.range} tone="range" />
      <HudChip icon={Heart} label="Hearts" value={`${YOU.hearts}/3`} tone="heart" />
      <HudChip icon={Users} label="Alive" value="6/8" />
    </>
  );

  return (
    <div ref={targetRef} className={cn(kiosk && "fixed inset-0 z-40 bg-background")}>
      {kiosk ? (
        <div
          className="flex h-full w-full flex-col bg-background"
          onKeyDown={(e) => {
            // Native fullscreen handles Esc itself; this covers the overlay fallback.
            // Open drawers stop propagation, so they close first.
            if (e.key === "Escape" && !document.fullscreenElement) {
              e.preventDefault();
              exit();
            }
          }}
        >
          {/* Thin tactical HUD strip */}
          <header className="flex shrink-0 flex-wrap items-center gap-2 border-b-2 border-foreground bg-card px-3 py-2">
            <span className="grid h-9 place-items-center rounded-[10px] border-2 border-foreground bg-secondary px-2.5 font-mono text-sm font-bold tabular-nums text-secondary-foreground shadow-brutal-sm">
              04:12
            </span>
            <span className="hidden font-mono text-[11px] uppercase tracking-wide text-muted-foreground sm:inline">
              Period 12
            </span>
            <div className="flex flex-wrap items-center gap-2 sm:ml-1">{chips}</div>
            <div className="ml-auto flex items-center gap-2">
              <KioskToggle
                icon={ListChecks}
                label="Queue"
                controls="kiosk-queue"
                open={queueOpen}
                onClick={() => setQueueOpen((o) => !o)}
              />
              <KioskToggle
                icon={MessageSquare}
                label="Chat"
                controls="kiosk-chat"
                open={chatOpen}
                onClick={() => setChatOpen((o) => !o)}
              />
              <Button variant="outline" size="sm" onClick={exit}>
                <Minimize2 className="size-4" />
                Exit
              </Button>
            </div>
          </header>

          {/* Board as the maximized centerpiece; panels slide over its edges. */}
          <div className="relative min-h-0 flex-1 p-3">
            <BoardScene3D fill />

            <Drawer
              open={queueOpen}
              onClose={() => setQueueOpen(false)}
              side="left"
              label="Action queue"
              id="kiosk-queue"
              verticalInset="top-14 bottom-0"
            >
              <ActionQueuePanel className="h-full" onClose={() => setQueueOpen(false)} onProposeTrade={proposeTrade} />
            </Drawer>

            <Drawer
              open={chatOpen}
              onClose={() => setChatOpen(false)}
              side="right"
              label="Chat"
              id="kiosk-chat"
              verticalInset="top-14 bottom-0"
            >
              <ChatPanel className="h-full" tab={chatTab} onTabChange={setChatTab} onClose={() => setChatOpen(false)} />
            </Drawer>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* HUD */}
          <div className="flex flex-col gap-3 rounded-[var(--radius)] border-2 border-foreground bg-card p-4 shadow-brutal lg:flex-row lg:items-center">
            <div className="flex items-center gap-3">
              <span className="grid h-12 place-items-center rounded-[10px] border-2 border-foreground bg-secondary px-3 font-mono text-lg font-bold tabular-nums text-secondary-foreground shadow-brutal-sm">
                04:12
              </span>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                  Period 12 · resolving soon
                </p>
                <p className="font-display text-sm font-bold">Plan your moves &amp; chat</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:ml-auto">{chips}</div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setQueueOpen(true)}
                aria-expanded={queueOpen}
                aria-controls="queue-drawer"
                className="inline-flex items-center gap-1.5 rounded-[10px] border-2 border-foreground bg-card px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wide shadow-brutal-sm transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:hidden"
              >
                <ListChecks className="size-4" />
                Queue
              </button>
              <button
                type="button"
                onClick={() => setChatOpen(true)}
                aria-expanded={chatOpen}
                aria-controls="chat-drawer"
                className="inline-flex items-center gap-1.5 rounded-[10px] border-2 border-foreground bg-card px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wide shadow-brutal-sm transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:hidden"
              >
                <MessageSquare className="size-4" />
                Chat
              </button>
              <Button ref={focusBtnRef} variant="outline" size="sm" onClick={enter}>
                <Maximize2 className="size-4" />
                Focus mode
              </Button>
            </div>
          </div>

          {/* Survival */}
          <div className="flex items-center gap-3 rounded-[var(--radius)] border-2 border-foreground bg-card px-4 py-3 shadow-brutal-sm">
            <Skull className="size-4 shrink-0 text-muted-foreground" />
            <Progress value={62} className="flex-1" barClassName="bg-secondary" label="Survival progress — 3 tanks left to win" />
            <span className="shrink-0 font-mono text-xs font-bold">3 to win</span>
          </div>

          {/* Desktop three-panel; mobile = board + edge drawers (never stacked below) */}
          <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)_340px]">
            <div className="hidden lg:block lg:h-[560px]">
              <ActionQueuePanel className="h-full" onProposeTrade={proposeTrade} />
            </div>
            <BoardScene3D />
            <div className="hidden lg:block lg:h-[560px]">
              <ChatPanel className="h-full" tab={chatTab} onTabChange={setChatTab} />
            </div>
          </div>

          {/* Mobile drawers (hidden ≥lg, where the panels are inline rails) */}
          <div className="lg:hidden">
            <Drawer open={queueOpen} onClose={() => setQueueOpen(false)} side="left" label="Action queue" id="queue-drawer">
              <ActionQueuePanel className="h-full" onClose={() => setQueueOpen(false)} onProposeTrade={proposeTrade} />
            </Drawer>
            <Drawer open={chatOpen} onClose={() => setChatOpen(false)} side="right" label="Chat" id="chat-drawer">
              <ChatPanel className="h-full" tab={chatTab} onTabChange={setChatTab} onClose={() => setChatOpen(false)} />
            </Drawer>
          </div>
        </div>
      )}
    </div>
  );
}

function KioskToggle({
  icon: Icon,
  label,
  controls,
  open,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  controls: string;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-controls={controls}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[10px] border-2 border-foreground px-2.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wide shadow-brutal-sm transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        open ? "bg-foreground text-background" : "bg-card",
      )}
    >
      <Icon className="size-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
