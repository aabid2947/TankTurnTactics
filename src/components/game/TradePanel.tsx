import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeftRight, Check, Send, X } from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { GamePlayer, MyPlayer } from "@/lib/gameTypes";

export function TradePanel({ gameId, me, players }: { gameId: Id<"games">; me?: MyPlayer; players: GamePlayer[] }) {
  const offers = useQuery(api.trade.getMyTradeOffers, { gameId }) ?? { incoming: [], outgoing: [] };
  const propose = useMutation(api.trade.proposeTrade);
  const respond = useMutation(api.trade.respondTrade);
  const cancel = useMutation(api.trade.cancelTrade);

  const [target, setTarget] = useState("");
  const [giveAp, setGiveAp] = useState(0);
  const [giveHearts, setGiveHearts] = useState(0);
  const [getAp, setGetAp] = useState(0);
  const [getHearts, setGetHearts] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const nameOf = (id: string) => players.find((p) => p._id === id)?.name ?? "a tank";
  const others = players.filter((p) => p.status === "alive" && p._id !== me?._id);
  const incoming = offers.incoming.filter((o) => o.status === "pending");

  const doPropose = async () => {
    setError(null);
    try {
      await propose({ gameId, toPlayerId: target as Id<"players">, giveAp, giveHearts, receiveAp: getAp, receiveHearts: getHearts });
      setGiveAp(0);
      setGiveHearts(0);
      setGetAp(0);
      setGetHearts(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not propose");
    }
  };

  return (
    <Card className="p-4">
      <h3 className="inline-flex items-center gap-2 font-display text-base font-bold">
        <ArrowLeftRight className="size-4" />
        Trade
      </h3>

      {incoming.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {incoming.map((o) => (
            <div key={o._id} className="flex flex-wrap items-center gap-2 rounded-[10px] border-2 border-foreground bg-card px-3 py-2 shadow-brutal-sm">
              <span className="font-mono text-[11px]">
                <strong>{nameOf(o.fromPlayerId)}</strong> gives {o.giveAp}AP {o.giveHearts}♥ · you give {o.receiveAp}AP {o.receiveHearts}♥
              </span>
              <div className="ml-auto flex gap-1.5">
                <Button size="sm" variant="accent" onClick={() => void respond({ offerId: o._id, accept: true })}>
                  <Check className="size-3.5" />
                  Accept
                </Button>
                <Button size="sm" variant="outline" onClick={() => void respond({ offerId: o._id, accept: false })} aria-label="Decline">
                  <X className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2 rounded-[10px] border-2 border-foreground/20 p-3">
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="h-9 rounded-[10px] border-2 border-foreground bg-card px-2 font-mono text-xs"
        >
          <option value="">Propose to…</option>
          {others.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-[11px]">
          <NumField label="You give AP" value={giveAp} onChange={setGiveAp} max={99} />
          <NumField label="You give ♥" value={giveHearts} onChange={setGiveHearts} max={3} />
          <NumField label="You get AP" value={getAp} onChange={setGetAp} max={99} />
          <NumField label="You get ♥" value={getHearts} onChange={setGetHearts} max={3} />
        </div>
        <Button size="sm" disabled={!target} onClick={() => void doPropose()}>
          <Send className="size-3.5" />
          Send offer
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <p className="font-mono text-[10px] leading-snug text-muted-foreground">
          Executes at the buzzer only if they accept and you're in range.
        </p>
      </div>

      {offers.outgoing.length > 0 && (
        <div className="mt-3 flex flex-col gap-1">
          {offers.outgoing.map((o) => (
            <div key={o._id} className="flex items-center gap-2 font-mono text-[11px]">
              <span className="flex-1 truncate">
                → {nameOf(o.toPlayerId)}: <span className="font-bold">{o.status}</span>
              </span>
              {o.status === "pending" && (
                <button onClick={() => void cancel({ offerId: o._id })} className="text-muted-foreground hover:text-destructive" aria-label="Cancel offer">
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function NumField({ label, value, onChange, max }: { label: string; value: number; onChange: (n: number) => void; max: number }) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.min(max, Math.floor(Number(e.target.value) || 0))))}
        className="h-8 w-16 rounded-[8px] border-2 border-foreground bg-card px-2 font-mono text-xs"
      />
    </label>
  );
}