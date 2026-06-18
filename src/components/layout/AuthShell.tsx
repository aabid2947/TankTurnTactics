import type { ReactNode } from "react";
import { Crosshair } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-lavender px-4 py-10">
      <div className="pointer-events-none absolute -left-12 -top-12 size-44 rounded-full border-2 border-foreground/20" />
      <div className="pointer-events-none absolute -right-8 bottom-12 size-28 rotate-12 border-2 border-foreground/20" />
      <div className="pointer-events-none absolute left-10 bottom-16 size-3 rounded-full bg-foreground/20" />

      <div className="relative w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="grid size-14 place-items-center rounded-full border-2 border-foreground bg-primary text-primary-foreground shadow-brutal">
            <Crosshair className="size-7" />
          </span>
          <h1 className="font-display text-2xl font-bold">Tank Turn Tactics</h1>
          <Badge variant="secondary">Top-3 survive</Badge>
        </div>
        <Card className="p-6">
          <div className="mb-4">
            <h2 className="font-display text-xl font-bold">{title}</h2>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {children}
          <div className="mt-4 text-center text-sm text-muted-foreground">{footer}</div>
        </Card>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
