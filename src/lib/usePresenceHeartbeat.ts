import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Ping presence for the current game every ~15s while mounted (and on tab refocus), so other players
 * see an online dot (Stage 6). The mutation is a no-op for non-members, so this is safe to call
 * unconditionally from any in-game screen.
 */
export function usePresenceHeartbeat(gameId: Id<"games">) {
  const heartbeat = useMutation(api.presence.heartbeat);
  useEffect(() => {
    void heartbeat({ gameId });
    const id = setInterval(() => void heartbeat({ gameId }), 15_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void heartbeat({ gameId });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [gameId, heartbeat]);
}
