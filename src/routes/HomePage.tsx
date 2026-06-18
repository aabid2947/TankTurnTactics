/**
 * Authenticated landing. Stage 0 keeps this static (proves the auth gate works without depending
 * on Convex-generated types). The real lobby + game list wire in at Stage 1.
 */
export function HomePage() {
  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold">You're signed in 🎉</h2>
      <p className="text-muted-foreground">
        Foundations are in place. The lobby, game list, and live board arrive in Stage 1.
      </p>
    </div>
  );
}
