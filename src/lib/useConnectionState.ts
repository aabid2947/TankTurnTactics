import { useEffect, useState } from "react";
import { useConvex } from "convex/react";

/**
 * Whether the Convex WebSocket is currently connected (Stage 6 offline feedback). Convex auto-resyncs
 * queries/mutations on reconnect, so this only drives a "reconnecting" banner. Polled, since the
 * connection state is a snapshot rather than a reactive value.
 */
export function useIsConnected(): boolean {
  const convex = useConvex();
  const [connected, setConnected] = useState(true);
  useEffect(() => {
    const tick = () => setConnected(convex.connectionState().isWebSocketConnected);
    tick();
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, [convex]);
  return connected;
}
