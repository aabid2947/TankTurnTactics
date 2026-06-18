import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { CreateGameScreen } from "@/screens/CreateGameScreen";
import { GameRoute } from "@/screens/GameRoute";
import { LobbyScreen } from "@/screens/LobbyScreen";
import { SignInScreen } from "@/screens/SignInScreen";

export default function App() {
  return (
    <>
      <AuthLoading>
        <div className="grid min-h-screen place-items-center bg-background font-mono text-sm text-muted-foreground">
          Loading…
        </div>
      </AuthLoading>
      <Unauthenticated>
        <SignInScreen />
      </Unauthenticated>
      <Authenticated>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<LobbyScreen />} />
            <Route path="/create" element={<CreateGameScreen />} />
            <Route path="/game/:gameId" element={<GameRoute />} />
          </Route>
        </Routes>
      </Authenticated>
    </>
  );
}
