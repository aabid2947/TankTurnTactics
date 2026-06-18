import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell, Field } from "@/components/layout/AuthShell";

export function SignupScreen() {
  return (
    <AuthShell
      title="Create account"
      subtitle="Pick a callsign and roll out."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-bold text-foreground underline">
            Sign in
          </Link>
        </>
      }
    >
      <form className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
        <Field label="Callsign">
          <Input placeholder="CyberNick" required />
        </Field>
        <Field label="Email">
          <Input type="email" placeholder="you@example.com" required />
        </Field>
        <Field label="Password">
          <Input type="password" placeholder="••••••••" required />
        </Field>
        <Button className="mt-2 w-full" asChild>
          <Link to="/">Create account</Link>
        </Button>
      </form>
    </AuthShell>
  );
}
