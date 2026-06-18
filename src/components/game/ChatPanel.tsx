import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DM_CHAT, GLOBAL_CHAT, type ChatMessage } from "@/lib/mock";
import { cn } from "@/lib/utils";

export function ChatPanel() {
  const [tab, setTab] = useState<"global" | "dm">("global");
  const messages = tab === "global" ? GLOBAL_CHAT : DM_CHAT;

  return (
    <Card className="flex h-full flex-col overflow-hidden p-0">
      <div className="flex border-b-2 border-foreground">
        {(["global", "dm"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 px-4 py-3 font-mono text-xs font-bold uppercase tracking-wide",
              tab === t ? "bg-secondary text-secondary-foreground" : "bg-card text-muted-foreground",
              t === "dm" && "border-l-2 border-foreground",
            )}
          >
            {t === "global" ? "Global" : "Vex · DM"}
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {messages.map((m) => (
          <Bubble key={m.id} m={m} />
        ))}
      </div>

      <form className="flex items-center gap-2 border-t-2 border-foreground p-3" onSubmit={(e) => e.preventDefault()}>
        <Input placeholder="Message…" className="font-sans" />
        <Button size="icon" type="submit" aria-label="Send">
          <Send className="size-4" />
        </Button>
      </form>
    </Card>
  );
}

function Bubble({ m }: { m: ChatMessage }) {
  return (
    <div className={cn("flex items-end gap-2", m.own && "flex-row-reverse")}>
      <span
        className="grid size-7 shrink-0 place-items-center rounded-full border-2 border-foreground font-mono text-[10px] font-bold text-ink"
        style={{ backgroundColor: m.color }}
      >
        {m.monogram}
      </span>
      <div
        className={cn(
          "max-w-[80%] rounded-[12px] border-2 border-foreground px-3 py-2 shadow-brutal-sm",
          m.own ? "bg-primary text-primary-foreground" : "bg-card",
        )}
      >
        {!m.own && (
          <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{m.author}</p>
        )}
        <p className="text-sm leading-snug">{m.text}</p>
        <p className={cn("mt-0.5 text-right font-mono text-[10px]", m.own ? "text-primary-foreground/70" : "text-muted-foreground")}>
          {m.time}
        </p>
      </div>
    </div>
  );
}
