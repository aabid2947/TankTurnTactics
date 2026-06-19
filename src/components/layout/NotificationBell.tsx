import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Bell } from "lucide-react";
import { api } from "@convex/_generated/api";
import { cn } from "@/lib/utils";

/**
 * Header notification center (Stage 6): a bell with an unread badge + a dropdown of recent in-app
 * notifications. Opening marks all read. When the user has granted permission, newly-arrived items
 * also fire a desktop (browser) notification — useful when the tab is backgrounded.
 */
export function NotificationBell() {
  const raw = useQuery(api.notifications.getMyNotifications);
  const data = useMemo(() => raw ?? { items: [], unread: 0 }, [raw]);
  const markAllRead = useMutation(api.notifications.markAllRead);
  const [open, setOpen] = useState(false);
  const seen = useRef<Set<string>>(new Set());
  const primed = useRef(false);

  useEffect(() => {
    const { items } = data;
    // First load: remember existing items so we don't fire a burst of stale desktop notifications.
    if (!primed.current) {
      items.forEach((n) => seen.current.add(n._id));
      primed.current = true;
      return;
    }
    const canNotify = typeof Notification !== "undefined" && Notification.permission === "granted";
    for (const n of items) {
      if (seen.current.has(n._id)) continue;
      seen.current.add(n._id);
      if (canNotify && n.readAt === undefined) {
        try {
          new Notification("Tank Turn Tactics", { body: n.body });
        } catch {
          /* ignore */
        }
      }
    }
  }, [data]);

  const enableDesktop = () => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission();
    }
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && data.unread > 0) void markAllRead();
  };

  return (
    <div className="relative">
      <button
        onClick={toggle}
        className="relative grid size-9 place-items-center rounded-full border-2 border-foreground bg-card shadow-brutal-sm"
        aria-label="Notifications"
      >
        <Bell className="size-4" />
        {data.unread > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full border-2 border-foreground bg-destructive px-1 font-mono text-[9px] font-bold text-destructive-foreground">
            {data.unread > 9 ? "9+" : data.unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <button className="fixed inset-0 z-20 cursor-default" aria-label="Close notifications" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-30 mt-2 w-72 rounded-[var(--radius)] border-2 border-foreground bg-card shadow-brutal">
            <div className="flex items-center justify-between border-b-2 border-foreground px-3 py-2">
              <span className="font-display text-sm font-bold">Notifications</span>
              <button
                onClick={enableDesktop}
                className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground hover:text-foreground"
              >
                Desktop alerts
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {data.items.length === 0 ? (
                <p className="p-4 text-center font-mono text-[11px] text-muted-foreground">Nothing yet.</p>
              ) : (
                data.items.map((n) => (
                  <div
                    key={n._id}
                    className={cn(
                      "border-b border-foreground/10 px-3 py-2 font-mono text-xs leading-snug",
                      n.readAt === undefined && "bg-secondary/20",
                    )}
                  >
                    {n.body}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
