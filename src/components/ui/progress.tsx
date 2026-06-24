import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number; // 0..100
  className?: string;
  barClassName?: string;
  label?: string;
}

export function Progress({ value, className, barClassName, label }: ProgressProps) {
  return (
    <div
      className={cn("h-4 w-full overflow-hidden rounded-full border-2 border-foreground bg-card", className)}
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full bg-primary transition-[width] duration-300", barClassName)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
