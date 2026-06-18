import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell, Field } from "@/components/layout/AuthShell";

export function LoginScreen() {
  return (
    <AuthShell
      title="Sign in"
      subtitle="Welcome back, commander."
      footer={
        <>
          New here?{" "}
          <Link to="/signup" className="font-bold text-foreground underline">
            Create an account
          </Link>
        </>
      }
    >
      <form className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
        <Field label="Email">
          <Input type="email" placeholder="you@example.com" required />
        </Field>
        <Field label="Password">
          <Input type="password" placeholder="••••••••" required />
        </Field>
        <Button className="mt-2 w-full" asChild>
          <Link to="/">Sign in</Link>
        </Button>
      </form>
    </AuthShell>
  );
}
