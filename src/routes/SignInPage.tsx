import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";

/** Email + password sign-in / sign-up using the Convex Auth Password provider. */
export function SignInPage() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h2 className="text-xl font-semibold">
        {flow === "signIn" ? "Sign in" : "Create account"}
      </h2>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          setSubmitting(true);
          const formData = new FormData(event.currentTarget);
          formData.set("flow", flow);
          void signIn("password", formData)
            .catch(() => setError("Could not authenticate — check your details and try again."))
            .finally(() => setSubmitting(false));
        }}
      >
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="Password"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <Button type="submit" className="w-full" disabled={submitting}>
          {flow === "signIn" ? "Sign in" : "Sign up"}
        </Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        type="button"
        className="text-sm text-muted-foreground underline"
        onClick={() => {
          setError(null);
          setFlow(flow === "signIn" ? "signUp" : "signIn");
        }}
      >
        {flow === "signIn" ? "Need an account? Sign up" : "Have an account? Sign in"}
      </button>
    </div>
  );
}
