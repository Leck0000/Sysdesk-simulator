# SysDesk

Browser-based IT help desk simulator for technician training.

## Quick Start

```bash
pnpm install
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm exec vite preview --port 3001
```

Open `http://localhost:3001/opendesk-simulator/?demo=1` for sample data.

## TypeScript Version

This project uses **TypeScript 6.0.3** (pinned in `package.json` as `"typescript": "~6.0.3"`).

**Why not TypeScript 7?**
- `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin` v8.x do not support TypeScript 7.
- Pinning to TS 6 ensures `pnpm lint` and `pnpm typecheck` use the same type checker.
- When typescript-eslint adds TS 7 support, we can bump the version.

## Project Structure

```
src/
├── app/              # Store, hooks, routes, demo data
├── features/
│   ├── auth/         # Login, auth API
│   ├── certificates/ # Certificate gallery, verification
│   ├── communication/# Chat, email
│   ├── desktop/      # WindowManager, panels (Services, EventViewer, etc.)
│   ├── layout/       # Workspace, Sidebar, TopBar
│   ├── scoring/      # RubricEditor, ScoreDashboard
│   ├── team/         # Team mode (cohorts, assignments)
│   └── tickets/      # Ticket queue, detail, API
├── shared/
│   ├── api/          # baseQuery with Zod validation
│   ├── components/   # Terminal, Toaster, Window
│   ├── middleware/   # wsMiddleware
│   └── ws/           # WebSocket client, events, slice
└── test/             # vitest setup, jest-dom types
```

## Demo Mode

Add `?demo=1` to the URL (or set `VITE_DEMO=1`) to seed:
- 5 sample tickets
- Services panel data (6 services)
- Event Log panel data (2 events)
- Team mode (`/team?demo=1`): a 6-student cohort and a lab progress stream

Without demo mode and no backend running, the ticket queue shows an error message — this is expected.
