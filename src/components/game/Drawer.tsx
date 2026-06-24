import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Side = "left" | "right";

const SIDE: Record<Side, { horiz: string; anim: string }> = {
  left: { horiz: "left-0", anim: "slide-in-from-left" },
  right: { horiz: "right-0", anim: "slide-in-from-right" },
};

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  label: string;
  side?: Side;
  /** Tailwind vertical-inset classes; defaults to full height. Kiosk passes e.g. "top-14 bottom-0". */
  verticalInset?: string;
  id?: string;
  children: ReactNode;
}

/**
 * Non-modal edge panel. Slides in on mount (reduced motion respected), leaves
 * the board reachable behind it (no focus trap), closes on Escape, and returns
 * focus to whatever opened it. Mounted only while open. The child panel draws
 * its own frame + visible close control.
 */
export function Drawer({
  open,
  onClose,
  label,
  side = "right",
  verticalInset = "inset-y-0",
  id,
  children,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => panelRef.current?.focus(), 20);
    return () => {
      window.clearTimeout(t);
      opener?.focus?.();
    };
  }, []);

  if (!open) return null;
  const s = SIDE[side];

  return (
    <div
      ref={panelRef}
      id={id}
      role="region"
      aria-label={label}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
      className={cn(
        "fixed z-50 w-[min(92vw,360px)] p-2 outline-none",
        "animate-in fade-in-0 duration-200 motion-reduce:animate-none",
        verticalInset,
        s.horiz,
        s.anim,
      )}
    >
      {children}
    </div>
  );
}
