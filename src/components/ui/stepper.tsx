import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepperProps {
  value: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
  className?: string;
}

export function Stepper({ value, onChange, min = 0, max = 999, suffix, className }: StepperProps) {
  const set = (next: number) => onChange?.(Math.max(min, Math.min(max, next)));
  const btn =
    "grid h-9 w-9 place-items-center rounded-full border-2 border-foreground bg-card shadow-brutal-sm transition-[transform,box-shadow] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-40";
  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <button type="button" className={btn} onClick={() => set(value - 1)} disabled={value <= min} aria-label="Decrease">
        <Minus className="size-4" />
      </button>
      <span className="min-w-[3.5rem] text-center font-mono text-lg font-bold tabular-nums">
        {value}
        {suffix ? <span className="ml-1 text-xs font-normal text-muted-foreground">{suffix}</span> : null}
      </span>
      <button type="button" className={btn} onClick={() => set(value + 1)} disabled={value >= max} aria-label="Increase">
        <Plus className="size-4" />
      </button>
    </div>
  );
}
