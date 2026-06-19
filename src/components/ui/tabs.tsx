import { cn } from "@/lib/utils";

/**
 * Minimal pill segmented control (no Radix dependency). Generic over a string union so callers keep
 * full type-safety on the active value — used for the right-panel History|Chat and chat Global|Direct.
 */
export function Tabs<T extends string>({
  value,
  onChange,
  items,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  items: ReadonlyArray<{ value: T; label: string }>;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex gap-1 rounded-full border-2 border-foreground bg-muted p-1", className)}>
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          onClick={() => onChange(it.value)}
          className={cn(
            "rounded-full px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wide transition-colors",
            value === it.value
              ? "border-2 border-foreground bg-primary text-primary-foreground shadow-brutal-sm"
              : "border-2 border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
