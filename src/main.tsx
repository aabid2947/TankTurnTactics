import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import App from "@/App";
import "@/index.css";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
if (!convexUrl) {
  // Surfaced clearly during local setup: `npx convex dev` writes VITE_CONVEX_URL to .env.local.
  console.error("VITE_CONVEX_URL is not set. Run `npm run dev:backend` (npx convex dev) first.");
}

const convex = new ConvexReactClient(convexUrl!);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexAuthProvider client={convex}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConvexAuthProvider>
  </StrictMode>,
);
