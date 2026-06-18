# Tank Turn Tactics

A multiplayer, grid-based strategy game with simultaneous turn resolution. See **`PRODUCT.md`**
for the game design and **`Implementation.md`** for the technical plan & ruleset. Working rules
and the staged roadmap live in **`CLAUDE.md`**; the file index is **`repo_structure.md`**.

## Stack
React + Vite + TypeScript · TailwindCSS + shadcn/ui · **Convex** (reactive DB + scheduled
functions) · Convex Auth.

## Prerequisites
- Node.js 22+
- A free [Convex](https://convex.dev) account (for the backend)

## Setup

```bash
npm install
```

### 1. Start the Convex backend (one-time login)
This is interactive the first time — it opens a browser to log in and creates your dev deployment,
then writes `VITE_CONVEX_URL` into `.env.local` and generates `convex/_generated/`.

```bash
npm run dev:backend      # = npx convex dev  (leave running)
```

Then configure Convex Auth env vars on the deployment (generates the JWT signing keys):

```bash
npx @convex-dev/auth
```

### 2. Start the web app (in a second terminal)
```bash
npm run dev
```

Open the printed URL, create an account (email + password), and you should land on the signed-in
home screen.

## Scripts
| Script | Purpose |
|---|---|
| `npm run dev` | Vite dev server (frontend) |
| `npm run dev:backend` | Convex dev (backend; keep running) |
| `npm run build` | Type-check + production build |
| `npm run typecheck` | `tsc -b` (frontend) |
| `npm run lint` | ESLint |
| `npm test` | Vitest (run once) |
| `npm run test:watch` | Vitest watch mode |

## CI
`.github/workflows/ci.yml` runs lint → typecheck → test → build on every push/PR. The Convex
backend is validated locally/at deploy via `convex dev` (CI does not need a deployment).
