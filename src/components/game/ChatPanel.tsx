import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { MessageSquare, Send } from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { displayName } from "@/lib/board";
import { cn } from "@/lib/utils";
import type { GamePlayer, MyPlayer } from "@/lib/gameTypes";

/** WhatsApp-style chat: a global broadcast feed + 1:1 DMs. Eliminated players may still chat. */
export function ChatPanel({ gameId, me, players }: { gameId: Id<"games">; me?: MyPlayer; players: GamePlayer[] }) {
  const chat = useQuery(api.chat.getChat, { gameId }) ?? { global: [], dms: [] };
  const send = useMutation(api.chat.sendChat);
  const [tab, setTab] = useState<"global" | "dm">("global");
  const [dmTarget, setDmTarget] = useState<string>("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const nameOf = (id: string) => players.find((p) => p._id === id)?.name ?? "a tank";
  const others = players.filter((p) => p._id !== me?._id);
  const thread = chat.dms.filter((m) => m.fromPlayerId === dmTarget || m.toPlayerId === dmTarget);
  const messages = tab === "global" ? chat.global : thread;

  const doSend = async () => {
    const content = text.trim();
    if (!content) return;
    setError(null);
    try {
      if (tab === "dm") {
        if (!dmTarget) {
          setError("Pick someone to DM");
          return;
        }
        await send({ gameId, scope: "dm", content, toPlayerId: dmTarget as Id<"players"> });
      } else {
        await send({ gameId, scope: "global", content });
      }
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send");
    }
  };

  return (
    <Card className="flex h-full flex-col overflow-hidden p-0">
      <div className="flex items-center justify-between gap-2 border-b-2 border-foreground bg-card px-4 py-3">
        <h3 className="inline-flex items-center gap-2 font-display text-base font-bold">
          <MessageSquare className="size-4" />
          Chat
        </h3>
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "global", label: "Global" },
            { value: "dm", label: "Direct" },
          ]}
        />
      </div>

      {tab === "dm" && (
        <div className="border-b-2 border-foreground/20 p-2">
          <select
            value={dmTarget}
            onChange={(e) => setDmTarget(e.target.value)}
            className="h-9 w-full rounded-[10px] border-2 border-foreground bg-card px-2 font-mono text-xs"
          >
            <option value="">Message…</option>
            {others.map((p) => (
              <option key={p._id} value={p._id}>
                {displayName(p.name)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <p className="m-auto font-mono text-[11px] text-muted-foreground">
            {tab === "dm"
              ? dmTarget
                ? "No messages yet."
                : "Pick a player to start a DM."
              : "No messages yet — say hi."}
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.fromPlayerId === me?._id;
            return (
              <div key={m._id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-[10px] border-2 border-foreground px-3 py-1.5 shadow-brutal-sm",
                    mine ? "bg-primary text-primary-foreground" : "bg-card",
                  )}
                >
                  {!mine && tab === "global" && (
                    <span className="block font-mono text-[10px] font-bold opacity-70">
                      {displayName(nameOf(m.fromPlayerId))}
                    </span>
                  )}
                  <span className="font-sans text-sm leading-snug">{m.content}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-center gap-2 border-t-2 border-foreground p-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void doSend();
          }}
          placeholder={me ? "Type a message…" : "Join the game to chat"}
          disabled={!me}
          maxLength={500}
        />
        <Button size="sm" onClick={() => void doSend()} disabled={!me} aria-label="Send message">
          <Send className="size-4" />
        </Button>
      </div>
      {error && <p className="px-3 pb-2 font-mono text-[11px] text-destructive">{error}</p>}
    </Card>
  );
}
