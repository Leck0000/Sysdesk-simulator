# SysDesk UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the browser-based SysDesk simulator front-end: ticket queue, simulated Windows desktop with terminal, AI voice chat, scoring dashboard, team mode views, and certificate gallery — all driven by the WebSocket/REST contracts in ARCHITECTURE.md.

**Architecture:** React 18 + TypeScript + Vite SPA. Single-page layout with a persistent top bar, left sidebar (ticket queue + navigation), and a central workspace that hosts either the "Desktop" view (window manager + xterm.js terminal + remote desktop canvas) or the "Dashboard" views (scoring, team progress, certificates). State managed with Redux Toolkit (proven in Win11React). Real-time via WebSocket envelope v1. Components are feature-scoped under `src/features/`.

**Tech Stack:**
- React 18, TypeScript 5, Vite 5
- Redux Toolkit + RTK Query (API) + custom WebSocket middleware
- xterm.js + xterm-addon-fit + xterm-addon-web-links (terminal)
- rustguac WASM + guacd (remote desktop streaming) — optional Phase 2
- Tailwind CSS + Headless UI (accessible primitives)
- @dnd-kit (drag-and-drop window manager)
- date-fns, uuid, zod (validation)

**Spec:** `C:\Users\Parzival\Documents\sysdesk\ARCHITECTURE.md` (sections 2, 3, 4.5, 5, 7)

---

## Global Constraints
- Node ≥ 20, pnpm 9
- Strict TS (`strict: true`, `noUncheckedIndexedAccess: true`)
- No `any`; use `unknown` + zod parsers at boundaries
- All WebSocket messages go through `wsMiddleware` (single source of truth)
- Redux state shape mirrors `ARCHITECTURE.md` data models (Ticket, SimulatedMachine, UserSession, Lab, Certificate, Team)
- CSS variables for theming (--fg, --bg, --accent, --border, --card) — no hardcoded colors
- Accessibility: WCAG 2.1 AA (focus visible, ARIA labels, keyboard navigation)
- Responsive: ≥1280px desktop-first; sidebar collapses to drawer <1024px
- Bundle target: ES2022, code-split by feature (React.lazy + Suspense)

---

## Review Focus
1. **WS reconnection storm** — network flap must not duplicate `seq` or leak subscriptions; test with `netem` 10% loss.
2. **Terminal paste bomb** — 10 MB paste into xterm.js must not freeze UI; test with `head -c 10M /dev/urandom | base64`.
3. **Window manager z-index collision** — 50+ windows stacked, drag/resize must not leak refs; stress test with automated clicks.
4. **Auth token expiry mid-session** — 5-min JWE refresh must re-auth WS without losing `seq`; test by fast-forwarding system clock.
5. **Team progress SSE backpressure** — 200 technicians broadcasting every 15 s must not OOM the tab; test with mocked 200 WS connections.

---

## File Structure (new files only)
```
src/
├── app/
│   ├── store.ts                 # Redux store + middleware
│   ├── hooks.ts                 # typed useSelector/useDispatch
│   ├── providers.tsx            # Redux Provider + WS Provider + Theme Provider
│   └── routes.tsx               # React Router v6 routes + lazy loads
├── features/
│   ├── auth/
│   │   ├── api.ts               # RTK Query auth endpoints (login/refresh/revoke)
│   │   ├── slice.ts             # auth state (token, user, roles)
│   │   └── LoginForm.tsx
│   ├── tickets/
│   │   ├── api.ts               # RTK Query tickets CRUD + claim/complete
│   │   ├── slice.ts             # queue filters, selectedTicketId
│   │   ├── TicketQueue.tsx      # left sidebar list (virtualized)
│   │   ├── TicketCard.tsx
│   │   └── TicketDetail.tsx     # right pane when ticket selected
│   ├── desktop/
│   │   ├── slice.ts             # windows[], zOrder[], activeWindowId
│   │   ├── WindowManager.tsx    # @dnd-kit container + Window components
│   │   ├── TerminalWindow.tsx   # xterm.js wrapper + WS command bridge
│   │   ├── RemoteDesktop.tsx    # rustguac canvas (Phase 2)
│   │   ├── EventViewer.tsx      # simulated Event Viewer grid
│   │   ├── ServicesPanel.tsx    # simulated Services.msc list
│   │   ├── RegistryEditor.tsx   # tree view + search
│   │   ├── NetworkPanel.tsx     # ipconfig/nslookup output + topology map
│   │   ├── ADUsersComputers.tsx # simulated ADUC tree
│   │   └── FileExplorer.tsx     # simulated Explorer (VFS)
│   ├── communication/
│   │   ├── slice.ts             # messages[], activeCall, requesterState
│   │   ├── ChatPanel.tsx        # ticket-threaded chat + AI voice button
│   │   ├── VoiceCall.tsx        # WebRTC + TTS/STT (Phase 2)
│   │   └── EmailThread.tsx      # simulated email view
│   ├── scoring/
│   │   ├── api.ts               # RTK Query score endpoints
│   │   ├── slice.ts             # live scores, rubric criteria
│   │   ├── ScoreDashboard.tsx   # real-time bars + evidence log
│   │   └── RubricEditor.tsx     # instructor-only YAML/JSON editor
│   ├── team/
│   │   ├── api.ts               # RTK Query org/cohort/assignment endpoints
│   │   ├── slice.ts             # cohorts[], assignments[], progressMap
│   │   ├── CohortDashboard.tsx  # instructor view: table + charts
│   │   ├── AssignmentView.tsx   # technician view: lab steps + validation
│   │   ├── ProgressStream.tsx   # WS `assignment.progress` consumer
│   │   └── BulkImport.tsx       # CSV/Multipart upload + progress
│   ├── certificates/
│   │   ├── api.ts               # RTK Query certificate endpoints
│   │   ├── slice.ts             # issued[], verification cache
│   │   ├── Gallery.tsx          # grid with verification links
│   │   └── VerificationPage.tsx # public `/verify/{type}/{id}` route
│   └── layout/
│       ├── TopBar.tsx           # user menu, notifications, theme toggle
│       ├── Sidebar.tsx          # collapsible nav + ticket queue
│       └── Workspace.tsx        # Suspense boundary for lazy features
├── shared/
│   ├── components/
│   │   ├── Window.tsx           # base window chrome (titlebar, resize handles)
│   │   ├── Terminal.tsx         # reusable xterm.js component
│   │   ├── VirtualList.tsx      # react-window wrapper
│   │   ├── Toaster.tsx          # sonner-style notifications
│   │   └── ConfirmDialog.tsx
│   ├── ws/
│   │   ├── envelope.ts          # WSEnvelope<T> types + validators
│   │   ├── client.ts            # singleton WS connection + reconnection logic
│   │   ├── middleware.ts        # Redux middleware: dispatch WS actions ↔ Redux
│   │   └── events.ts            # action creators for each WS event type
│   ├── utils/
│   │   ├── idempotency.ts       # generate/store idempotency keys
│   │   ├── validation.ts        # zod schemas mirrored from backend
│   │   └── formatters.ts        # date, bytes, duration helpers
│   └── styles/
│       ├── globals.css          # Tailwind + CSS variables
│       └── theme.css            # light/dark token maps
└── main.tsx                     # bootstrap
```

---

## Task Breakdown

### Task 1: Project Scaffold & Tooling
**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `.eslintrc.cjs`, `.prettierrc`, `pnpm-lock.yaml`
- Create: `src/main.tsx`, `src/app/providers.tsx`, `src/app/store.ts`, `src/app/hooks.ts`, `src/app/routes.tsx`
- Create: `src/shared/styles/globals.css`, `src/shared/styles/theme.css`
- Test: `vitest.config.ts`, `src/test/setup.ts`

**Interfaces:**
- Consumes: —
- Produces: Redux store with `wsMiddleware`, typed hooks, Router with lazy routes, CSS variable theme system

- [ ] **Step 1: Write failing test** — `src/test/smoke.test.tsx` renders `<App />` without crash
```tsx
import { render, screen } from '@testing-library/react';
import { App } from '../src/main';

test('app mounts', () => {
  render(<App />);
  expect(screen.getByTestId('app-root')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**  
Run: `pnpm vitest run src/test/smoke.test.tsx`  
Expected: FAIL — module not found

- [ ] **Step 3: Implement scaffold files** — install deps, write configs, bootstrap Redux + Router + Providers
```bash
pnpm init
pnpm add react react-dom react-router-dom @reduxjs/toolkit @tanstack/react-query xterm @xterm/addon-fit @xterm/addon-web-links @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities clsx tailwind-merge zod date-fns uuid sonner
pnpm add -D typescript vite @vitejs/plugin-react tailwindcss postcss autoprefixer vitest @testing-library/react @testing-library/jest-dom jsdom @types/react @types/react-dom @types/uuid eslint prettier @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

- [ ] **Step 4: Run test to verify it passes**  
Run: `pnpm vitest run src/test/smoke.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit**  
```bash
git add .
git commit -m "chore: scaffold React+TS+Vite+Redux+Tailwind project"
```

---

### Task 2: WebSocket Infrastructure
**Files:**
- Create: `src/shared/ws/envelope.ts`, `src/shared/ws/client.ts`, `src/shared/ws/middleware.ts`, `src/shared/ws/events.ts`
- Modify: `src/app/store.ts` (add `wsMiddleware`)
- Test: `src/shared/ws/client.test.ts`

**Interfaces:**
- Consumes: `auth.slice.ts` (accessToken for WS auth)
- Produces: `WSClient` singleton, `wsMiddleware` dispatching `ws/*` actions, typed event creators

- [ ] **Step 1: Write failing test** — `client.test.ts` verifies envelope parsing + reconnection
```ts
import { parseEnvelope, WSClient } from './client';

test('parses v1 envelope', () => {
  const msg = { v: 1, t: 'cmd.result', sid: 's1', seq: 1, ts: Date.now(), payload: { exitCode: 0, stdout: 'ok' } };
  expect(parseEnvelope(msg)).toEqual(expect.objectContaining({ type: 'cmd.result' }));
});
```

- [ ] **Step 2: Run test to verify it fails**  
Run: `pnpm vitest run src/shared/ws/client.test.ts`  
Expected: FAIL

- [ ] **Step 3: Implement WS client + middleware** — exponential backoff (1s, 2s, 4s, max 30s), `seq` acknowledgment, heartbeat (30s), token refresh on 401, `sid` namespacing
```ts
// client.ts key signatures
export const wsClient = new WSClient({
  url: import.meta.env.VITE_WS_URL,
  getToken: () => store.getState().auth.accessToken,
  onMessage: (envelope) => store.dispatch(wsMessageReceived(envelope)),
});
```

- [ ] **Step 4: Run test to verify it passes**  
Run: `pnpm vitest run src/shared/ws/client.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**  
```bash
git add src/shared/ws src/app/store.ts
git commit -m "feat: WebSocket client + Redux middleware with envelope v1"
```

---

### Task 3: Authentication Feature
**Files:**
- Create: `src/features/auth/api.ts`, `src/features/auth/slice.ts`, `src/features/auth/LoginForm.tsx`
- Test: `src/features/auth/api.test.ts`, `src/features/auth/slice.test.ts`

**Interfaces:**
- Consumes: `wsClient` (for token refresh coordination)
- Produces: `authApi` (RTK Query), `authSlice` (token, user, roles), `LoginForm` component

- [ ] **Step 1: Write failing tests** — login/refresh/revoke endpoints + slice reducers
- [ ] **Step 2: Run tests to verify they fail**
- [ ] **Step 3: Implement RTK Query endpoints + slice + LoginForm** — JWT in memory, refresh token in httpOnly cookie (via backend), role claims typed as `'technician' | 'instructor' | 'admin'`
- [ ] **Step 4: Run tests to verify they pass**
- [ ] **Step 5: Commit**

---

### Task 4: Ticket Queue + Sidebar Layout
**Files:**
- Create: `src/features/tickets/api.ts`, `src/features/tickets/slice.ts`, `src/features/tickets/TicketQueue.tsx`, `src/features/tickets/TicketCard.tsx`, `src/features/tickets/TicketDetail.tsx`
- Modify: `src/features/layout/Sidebar.tsx`, `src/features/layout/Workspace.tsx`
- Test: `src/features/tickets/api.test.ts`, `src/features/tickets/slice.test.ts`

**Interfaces:**
- Consumes: `authApi` (for auth headers), `wsMiddleware` (for `ticket_update` events)
- Produces: `ticketsApi`, `ticketsSlice`, queue UI components

- [ ] **Step 1: Write failing tests** — list/filter/claim/complete endpoints; slice reducers for `selectedTicketId`, `filters`
- [ ] **Step 2: Run tests to verify they fail**
- [ ] **Step 3: Implement API + slice + virtualized queue (react-window) + detail pane** — priority badge colors from ARCHITECTURE.md, real-time `ticket_update` via WS updates Redux
- [ ] **Step 4: Run tests to verify they pass**
- [ ] **Step 5: Commit**

---

### Task 5: Window Manager + Base Window Chrome
**Files:**
- Create: `src/shared/components/Window.tsx`, `src/features/desktop/slice.ts`, `src/features/desktop/WindowManager.tsx`
- Test: `src/features/desktop/slice.test.ts`, `src/shared/components/Window.test.tsx`

**Interfaces:**
- Consumes: `desktopSlice` (windows[], zOrder[], activeWindowId)
- Produces: `Window` component (titlebar, drag, resize, minimize, maximize, close), `WindowManager` (DnD container, z-index management)

- [ ] **Step 1: Write failing tests** — open/close/minimize/maximize/drag/resize actions update slice correctly; z-index reorder on focus
- [ ] **Step 2: Run tests to verify they fail**
- [ ] **Step 3: Implement slice + Window + WindowManager** — @dnd-kit `SortableContext` for z-order; CSS Grid for positioning; persist window state per session
- [ ] **Step 4: Run tests to verify they pass**
- [ ] **Step 5: Commit**

---

### Task 6: Terminal Window (xterm.js + WS Bridge)
**Files:**
- Create: `src/shared/components/Terminal.tsx`, `src/features/desktop/TerminalWindow.tsx`
- Test: `src/shared/components/Terminal.test.tsx`, `src/features/desktop/TerminalWindow.test.tsx`

**Interfaces:**
- Consumes: `wsClient` (send `send_command`, receive `command_output`), `desktopSlice` (windowId → machineId mapping)
- Produces: Reusable `Terminal` component (xterm.js + fit + web-links addons), `TerminalWindow` (Window chrome + Terminal)

- [ ] **Step 1: Write failing tests** — Terminal mounts xterm, writes stdout, sends keystrokes via WS, handles `command_output` event
- [ ] **Step 2: Run tests to verify they fail**
- [ ] **Step 3: Implement Terminal + TerminalWindow** — `useEffect` mounts xterm on canvas, `wsClient.on('command_output', ...)` writes to terminal, keyboard handler sends `send_command` with `machineId` + `command`; scrollback 10k lines; copy/paste via Clipboard API
- [ ] **Step 4: Run tests to verify they pass**
- [ ] **Step 5: Commit**

---

### Task 7: Simulated Windows Apps (Event Viewer, Services, Registry, Network, AD, Explorer)
**Files (each app = Window + feature panel):**
- Create: `src/features/desktop/EventViewer.tsx`, `src/features/desktop/ServicesPanel.tsx`, `src/features/desktop/RegistryEditor.tsx`, `src/features/desktop/NetworkPanel.tsx`, `src/features/desktop/ADUsersComputers.tsx`, `src/features/desktop/FileExplorer.tsx`
- Modify: `src/features/desktop/slice.ts` (add app launch actions)
- Test: one `.test.tsx` per app (snapshot + interaction)

**Interfaces:**
- Consumes: `wsClient` (`state.delta` events for each subsystem), `desktopSlice` (openWindow action)
- Produces: Six app components reading Redux state (subsystem data synced via WS `state.delta`)

- [ ] **Step 1: Write failing tests** — each app renders simulated data, reacts to `state.delta` updates
- [ ] **Step 2: Run tests to verify they fail**
- [ ] **Step 3: Implement each app** — Virtualized tables (react-window), search/filter, context menus; RegistryEditor = tree view with lazy load; NetworkPanel = topology map (SVG) + live metrics; ADUsersComputers = tree with OU nesting
- [ ] **Step 4: Run tests to verify they pass**
- [ ] **Step 5: Commit** (one commit per app or grouped)

---

### Task 8: Communication Panel (Chat + AI Voice + Email)
**Files:**
- Create: `src/features/communication/slice.ts`, `src/features/communication/ChatPanel.tsx`, `src/features/communication/VoiceCall.tsx`, `src/features/communication/EmailThread.tsx`
- Test: `src/features/communication/slice.test.ts`, component tests

**Interfaces:**
- Consumes: `wsClient` (`requester_message`, `scoring_update`), `ticketsSlice` (selectedTicketId)
- Produces: Chat panel (threaded per ticket), VoiceCall (WebRTC placeholder — Phase 2), EmailThread (simulated)

- [ ] **Step 1: Write failing tests** — message send/receive, requester typing indicator, scoring toast
- [ ] **Step 2: Run tests to verify they fail**
- [ ] **Step 3: Implement slice + components** — optimistic UI for sent messages, WS `add_ticket_message` → `requester_message` echo, AI voice button calls `/api/v1/voice/start` (Phase 2)
- [ ] **Step 4: Run tests to verify they pass**
- [ ] **Step 5: Commit**

---

### Task 9: Scoring Dashboard + Rubric Editor
**Files:**
- Create: `src/features/scoring/api.ts`, `src/features/scoring/slice.ts`, `src/features/scoring/ScoreDashboard.tsx`, `src/features/scoring/RubricEditor.tsx`
- Test: `src/features/scoring/api.test.ts`, `src/features/scoring/slice.test.ts`

**Interfaces:**
- Consumes: `wsClient` (`scoring_update` real-time), `ticketsSlice` (selectedTicketId)
- Produces: Live score bars (technical/process/communication), evidence log, RubricEditor (Monaco Editor for YAML/JSON, instructor-only)

- [ ] **Step 1: Write failing tests** — score fetch, SSE stream parsing, rubric validation
- [ ] **Step 2: Run tests to verify they fail**
- [ ] **Step 3: Implement API + slice + dashboard + editor** — `EventSource` for `/score/{type}/stream`, reconnect on error; RubricEditor validates against `rubric_dsl.json` schema
- [ ] **Step 4: Run tests to verify they pass**
- [ ] **Step 5: Commit**

---

### Task 10: Team Mode Views (Cohort Dashboard + Assignment View + Progress Stream)
**Files:**
- Create: `src/features/team/api.ts`, `src/features/team/slice.ts`, `src/features/team/CohortDashboard.tsx`, `src/features/team/AssignmentView.tsx`, `src/features/team/ProgressStream.tsx`, `src/features/team/BulkImport.tsx`
- Test: `src/features/team/api.test.ts`, `src/features/team/slice.test.ts`

**Interfaces:**
- Consumes: `wsClient` (`assignment.progress` WS room), `authSlice` (role for instructor vs technician views)
- Produces: Instructor cohort table + charts (Recharts), Technician step-by-step lab view with validation expressions, BulkImport (CSV drag-drop + progress)

- [ ] **Step 1: Write failing tests** — assignment CRUD, progress aggregation, WS room join/leave
- [ ] **Step 2: Run tests to verify they fail**
- [ ] **Step 3: Implement API + slice + views** — `ProgressStream` subscribes to `ws://host/ws/progress/{assignment_id}`, updates Redux `progressMap`; AssignmentView evaluates validation expressions (`$last_exit_code`, `$stdout`) client-side for instant feedback
- [ ] **Step 4: Run tests to verify they pass**
- [ ] **Step 5: Commit**

---

### Task 11: Certificate Gallery + Public Verification Page
**Files:**
- Create: `src/features/certificates/api.ts`, `src/features/certificates/slice.ts`, `src/features/certificates/Gallery.tsx`, `src/features/certificates/VerificationPage.tsx`
- Modify: `src/app/routes.tsx` (add public `/verify/:type/:id` route)
- Test: `src/features/certificates/api.test.ts`, `src/features/certificates/VerificationPage.test.tsx`

**Interfaces:**
- Consumes: `authSlice` (userId for gallery), public route needs no auth
- Produces: Gallery grid (issued certificates with verification links), VerificationPage (fetches `/certificates/validate`, shows payload + signature status)

- [ ] **Step 1: Write failing tests** — gallery fetch, verification page loads cert + validates Ed25519 signature via backend
- [ ] **Step 2: Run tests to verify they fail**
- [ ] **Step 3: Implement API + slice + components** — Gallery uses `VirtualList`; VerificationPage shows canonical JSON + signature badge (valid/invalid)
- [ ] **Step 4: Run tests to verify they pass**
- [ ] **Step 5: Commit**

---

### Task 12: Top Bar, Notifications, Theme, Responsive Polish
**Files:**
- Create: `src/features/layout/TopBar.tsx`, `src/shared/components/Toaster.tsx`
- Modify: `src/features/layout/Sidebar.tsx` (drawer <1024px), `src/shared/styles/globals.css` (breakpoints)
- Test: visual regression (Chromatic/Storybook) + e2e (Playwright)

**Interfaces:**
- Consumes: `authSlice` (user menu), `wsClient` (connection status), `ticketsSlice` (unread count)
- Produces: TopBar (user avatar, theme toggle, WS status indicator), Toaster (sonner), responsive Sidebar drawer

- [ ] **Step 1: Write failing tests** — theme toggle persists, drawer opens/closes, WS status reflects connection state
- [ ] **Step 2: Run tests to verify they fail**
- [ ] **Step 3: Implement TopBar + Toaster + responsive Sidebar** — CSS variables for theming, `localStorage` theme persistence, `matchMedia` listener
- [ ] **Step 4: Run tests to verify they pass**
- [ ] **Step 5: Commit**

---

### Task 13: E2E Smoke Test + CI Pipeline
**Files:**
- Create: `playwright.config.ts`, `tests/e2e/smoke.spec.ts`, `.github/workflows/ci.yml`
- Test: `pnpm playwright test`

**Interfaces:**
- Consumes: full built app
- Produces: CI pipeline (lint → typecheck → unit → build → e2e)

- [ ] **Step 1: Write failing e2e test** — login → claim ticket → open terminal → run `ipconfig` → see output → logout
- [ ] **Step 2: Run test to verify it fails** (no backend yet)
- [ ] **Step 3: Implement CI workflow** — matrix Node 20/22, pnpm cache, Playwright chromium/firefox/webkit
- [ ] **Step 4: Run test against local dev stack** (backend mock via MSW)
- [ ] **Step 5: Commit**

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-10-28-sysdesk-ui-implementation.md`. Please review the plan. Which execution approach would you prefer?

- **Subagent-driven** — A fresh subagent implements each task and a fresh reviewer checks it before the next one starts, then a whole-branch review at the end. Most thorough; costs a fresh context per task and per review.
- **Native** — I implement every task myself in this session, the way this harness runs work, then one fresh reviewer on the most capable model checks the whole branch. Cheapest and fastest; no independent review until the end.

**For this plan I recommend Subagent-driven**, because the 13 tasks have strong sequential dependencies (WS → auth → tickets → desktop → apps → communication → scoring → team → certificates) and a shipped mistake in the WebSocket middleware or Redux types would cascade across all features. Does the plan capture what you want, and which approach should we use?