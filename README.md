# SysDesk Simulator

**Browser-based IT help desk simulator for technician training.**

Simulate a complete support shift: claim tickets, investigate virtual Windows machines, communicate with users via AI voice, verify fixes, and earn verifiable certificates. The system scores technical accuracy, process adherence, and communication skills.

---

## Overview

SysDesk is a deterministic, browser-based Windows simulator that runs a complete support shift in one connected workspace. Technicians claim tickets, investigate simulated Windows machines using realistic command-line tools, communicate with users via AI voice, and earn Ed25519-signed certificates upon completion.

The system evaluates performance across three dimensions:

- **Technical accuracy** — correct command usage and effective troubleshooting
- **Process adherence** — following proper workflows and escalation paths
- **Communication** — clear user interaction and documentation

---

## Features

| Feature | Description |
|---|---|
| **Ticketing System** | Claim, work, and resolve tickets with status tracking (`open` → `in_progress` → `on_hold` → `resolved` → `closed`) |
| **Windows Subsystem FSMs** | Deterministic finite state machines for Services, Registry, Event Log, Network, Active Directory, and Filesystem |
| **Command Execution** | 60+ realistic Windows commands (`ipconfig`, `netsh`, `Get-Service`, `ping`, etc.) with validation and RBAC |
| **AI Voice Integration** | Simulated user communication via speech synthesis |
| **Certificate Issuance** | Ed25519-signed certificates upon successful ticket completion |
| **Role-Based Access** | Three roles: `technician`, `instructor`, `admin` with distinct permissions |
| **Responsive UI** | Desktop (≥1280px) and drawer collapses <1024px |
| **CSS Variable Theming** | `--fg, --bg, --accent, --border, --card` — no hardcoded colors |
| **Zod Boundary Validation** | All API boundaries validated with Zod schemas |
| **WebSocket Real-time** | State delta broadcasts via WebSocket for live updates |

---

## Architecture

### Frontend

- **React 18 + TypeScript** + Vite UI
- **xterm.js** for terminal emulation
- **Redux Toolkit / Zustand** for state management
- **Tailwind CSS** with `tailwind-merge` for utility composition
- CSS variable theming (no hardcoded colors)

### Simulation Engine

- Deterministic FSM state machines for 6 Windows subsystems
- Command bus with parse → auth → lock → apply → emit → release flow
- ~62 commands across network, services, event log, and more
- Snapshot durability (MessagePack + JSONL WAL)
- Per-session isolation for multi-tenant safety

### API & Authentication

- **Base URL**: `http://localhost:8080/api/v1`
- **JWT Auth**: Short-lived JWE (5-minute expiry)
- **Roles**: `technician`, `instructor`, `admin`
- **Rate Limits**: Endpoint-specific limits (auth: 5/5min, public: 60/min, writes: 10/min)
- **Error Codes**: 400/401/403/404/409/415/429/500 with Zod error schemas

### Data Models (TypeScript/Zod)

- **Ticket** — UUID, queue, priority, category, state
- **Machine** — UUID, lab, status, type, hardware spec
- **User** — UUID, role, name, email
- **Certificate** — UUID, issued-to, ticket ID, signature, expiry

---

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 9.12.0

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

Runs the Vite dev server at `http://localhost://5173` (or next available port).

### Building

```bash
pnpm build
```

Outputs to `dist/`.

### Testing

```bash
pnpm test
```

Runs Vitest unit tests.

```bash
pnpm test:e2e
```

Runs Playwright E2E tests.

---

## API Contracts

**Base URL**: `http://localhost:8080/api/v1`

All authenticated routes require `Authorization: Bearer <token>` header.

### Authentication

- `POST /auth/login` — `{ email, password }` → `{ accessToken, refreshToken, expiresIn, user }`
- `POST /auth/refresh` — `{ refreshToken }` → `{ accessToken, expiresIn }`
- `POST /auth/revoke` — `{ refreshToken }` → `{ success: boolean }`

### Users

- `GET /users/me` — current user profile
- `GET /users/:id` — retrieve user by ID (admin/instructor only)
- `PATCH /users/:id` — update profile (partial)
- `POST /users` — create user (admin only)

### Tickets

- `GET /tickets` — list tickets (filter: status, assignee, lab, priority)
- `GET /tickets/:id` — retrieve ticket
- `POST /tickets` — create ticket (requester or instructor)
- `PATCH /tickets/:id` — update ticket status/priority/assignee
- `POST /tickets/:id/complete` — mark ticket complete (assign scoring)
- `POST /tickets/:id/idempotency` — retry with idempotency key

### Machines

- `GET /machines` — list machines (filter: lab, status, type)
- `GET /machines/:id` — retrieve machine spec
- `POST /machines` — add machine (admin/instructor)
- `PATCH /machines/:id` — update machine state
- `POST /machines/:id/start` — start machine simulation
- `POST /machines/:id/stop` — stop machine simulation

### Error Response Schema (Zod)

```ts
import { z } from 'zod';

export const ErrorResponse = z.object({
  code: z.number().int(),
  message: z.string(),
  path: z.string().optional(),
  timestamp: z.string().datetime(),
  requestId: z.string().uuid(),
});

export type ErrorResponse = z.infer<typeof ErrorResponse>;
```

Rate limits exceeded return `429 Too Many Requests` with `Retry-After` header.

---

## Project Structure

```
src/
  shared/           # Shared components (Toaster, Window, Toaster)
  features/         # Feature tickets, windows, WS
  shared/middleware# WS middleware & enums
  shared/styles/    # CSSglobals
tsconfig.json       # strict TS: true, noUncheckedIndexedAccess: true
vite.config.ts      # React + Tailwind plugin config
```

---

## Development Conventions

- **No `any` types** in source code (only `as any` in test utilities is acceptable)
- **Strict TypeScript**: `strict: true`, `noUncheckedIndexedAccess: true`
- **CSS variable theming**: `--fg, --bg, --accent, --border, --card` — no hardcoded colors
- **Responsive layout**: desktop ≥1280px, drawer collapses <1024px
- **Zod boundary validation** at all API boundaries
- **Responsive**: desktop ≥1280px, drawer collapses <1024px
---

## Research & Prior Art

This simulator draws from research across 9 prior art platforms:

- HackTheBox, TryHackMe
- Microsoft Windows Simulators
- CyberRange, Instruqt, Strigo, Azure Lab Services
- RangeForce, Immersive Labs

Design decisions derived from analyzing these platforms' approaches to technical training, state management, and assessment.

---

## License

ISC