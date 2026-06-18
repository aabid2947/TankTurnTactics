import { Outlet } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated } from "convex/react";
import { Button } from "@/components/ui/button";

export function AppLayout() {
  const { signOut } = useAuthActions();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <h1 className="text-lg font-semibold">Tank Turn Tactics</h1>
        <Authenticated>
          <Button variant="outline" size="sm" onClick={() => void signOut()}>
            Sign out
          </Button>
        </Authenticated>
      </header>
      <main className="mx-auto max-w-5xl p-6">
        <Outlet />
      </main>
    </div>
  );
}
