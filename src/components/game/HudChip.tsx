import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface HudChipProps {
  icon: LucideIcon;
  label: string;
  value?: string | number;
  tone?: "default" | "ap" | "heart" | "range" | "primary";
  className?: string;
}

const TONES: Record<NonNullable<HudChipProps["tone"]>, string> = {
  default: "text-foreground",
  ap: "text-ap",
  heart: "text-heart",
  range: "text-range",
  primary: "text-primary",
};

export function HudChip({ icon: Icon, label, value, tone = "default", className }: HudChipProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border-2 border-foreground bg-card px-3 py-1 shadow-brutal-sm",
        className,
      )}
    >
      <Icon className={cn("size-4", TONES[tone])} />
      <span className="font-mono text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      {value !== undefined && <span className="font-mono text-sm font-bold tabular-nums">{value}</span>}
    </div>
  );
}
