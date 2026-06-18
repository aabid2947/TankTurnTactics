import { Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { CreateGameScreen } from "@/screens/CreateGameScreen";
import { DemoIndex } from "@/screens/DemoIndex";
import { GameHistoryScreen } from "@/screens/GameHistoryScreen";
import { GameScreen } from "@/screens/GameScreen";
import { HomeScreen } from "@/screens/HomeScreen";
import { LoginScreen } from "@/screens/LoginScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { ResultsScreen } from "@/screens/ResultsScreen";
import { SignupScreen } from "@/screens/SignupScreen";
import { WaitingRoomScreen } from "@/screens/WaitingRoomScreen";

export default function App() {
  return (
    <Routes>
      {/* Pre-auth, full-screen */}
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/signup" element={<SignupScreen />} />

      {/* App shell with header + nav */}
      <Route element={<AppShell />}>
        <Route index element={<HomeScreen />} />
        <Route path="/create" element={<CreateGameScreen />} />
        <Route path="/waiting" element={<WaitingRoomScreen />} />
        <Route path="/game" element={<GameScreen />} />
        <Route path="/history" element={<GameHistoryScreen />} />
        <Route path="/results" element={<ResultsScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="/screens" element={<DemoIndex />} />
      </Route>
    </Routes>
  );
}
