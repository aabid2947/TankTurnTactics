import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell, Field } from "@/components/layout/AuthShell";

/** Email + password sign-in / sign-up via Convex Auth (no email verification). */
export function SignInScreen() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <AuthShell
      title={flow === "signIn" ? "Sign in" : "Create account"}
      subtitle={flow === "signIn" ? "Welcome back, commander." : "Pick an email and roll out."}
      footer={
        <button
          type="button"
          className="font-medium text-foreground underline"
          onClick={() => {
            setError(null);
            setFlow(flow === "signIn" ? "signUp" : "signIn");
          }}
        >
          {flow === "signIn" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
      }
    >
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          setSubmitting(true);
          const formData = new FormData(event.currentTarget);
          formData.set("flow", flow);
          void signIn("password", formData)
            .catch(() => setError("Couldn't authenticate — check your details and try again."))
            .finally(() => setSubmitting(false));
        }}
      >
        <Field label="Email">
          <Input name="email" type="email" required placeholder="you@example.com" />
        </Field>
        <Field label="Password">
          <Input name="password" type="password" required placeholder="••••••••" />
        </Field>
        <Button type="submit" className="mt-2 w-full" disabled={submitting}>
          {flow === "signIn" ? "Sign in" : "Sign up"}
        </Button>
      </form>
      {error && <p className="mt-3 text-center text-sm text-destructive">{error}</p>}
    </AuthShell>
  );
}
