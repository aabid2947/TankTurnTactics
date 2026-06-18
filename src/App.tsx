import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { HomePage } from "@/routes/HomePage";
import { SignInPage } from "@/routes/SignInPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route
          index
          element={
            <>
              <AuthLoading>
                <p className="text-muted-foreground">Loading…</p>
              </AuthLoading>
              <Authenticated>
                <HomePage />
              </Authenticated>
              <Unauthenticated>
                <SignInPage />
              </Unauthenticated>
            </>
          }
        />
      </Route>
    </Routes>
  );
}
