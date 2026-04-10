# AI Assistant Instructions for MGC2025

These notes are written for any OpenAI/CoPilot/agent that lands in this repo. The goal is to make you productive quickly by surfacing the project's structure, conventions and gotchas.

---
## High‑Level Architecture

- **Next.js 16 / App Router** with a mixture of **server components** and **client components**.  The `app/` directory contains the UI; `app/layout.tsx` is an `async` server component that injects the `DevDateSwitcher` cookie (see below) and wraps everything in providers.
- **Authentication** is handled by [`next-auth`](https://next-auth.js.org/) in `auth.ts` using a `Credentials` provider and a custom JWT callback.  The exported `auth()` helper is used inside server actions for access control.  Session objects include a `doneOnboarding` boolean and `hasTodayState` flag.
- **Database**: PostgreSQL via Prisma.  Schema lives in `prisma/schema.prisma` with models for `User`, `Thread`/`Message`, `State`/`Module`/`Progress`, `External`, etc.  Generated client in `generated/prisma`.  Database URL is pulled from `DATABASE_URL` in `.env.local`.
- **LLM logic** is central; there are two LLM subsystems:
  * *Onboarding/questionnaire* in `lib/llm/` (`service.ts`, `model.ts`, `schemas/`).  Uses `generateObject()` from `ai` + Zod schemas to request and validate structured questions/responses.
  * *State generation* (see `lib/state/` and `lib/state/services/full.ts`).  A "blueprint" approach produces daily modules (nutrition, exercise, etc.) from previous state + compiled external context.
- **RAG pipeline** with Pinecone: hospital guidelines are embedded & queried (`lib/rag.ts`).  Two API routes support ingestion (`/api/ingest`) and chat (`/api/chat`).  Python helpers under `python/ingestion/` can be used for offline indexing.
- **Client‑side data fetching** is done with `@tanstack/react-query`.  All remote interactions go through `lib/actions.ts` which wraps server logic in `authenticatedAction()`.
- **State/date simulation**: the `DateContext` (in `context/DateContext.tsx`) exposes `normalizedDate`, `isSimulated` and `isToday`.  A cookie named `dev-simulated-date` is used by `app/layout.tsx` to seed the provider; developers can switch dates with `DevDateSwitcher` (dev‑only component).

---
## Critical Developer Workflows

1. **Bootstrapping**
   ```bash
   npm ci && npx prisma generate
   # create or update schema
   npx prisma migrate dev
   npm run dev
   ```
   The `.env.local` file must define at least:
   - `DATABASE_URL` (Postgres)
   - `PINECONE_API_KEY` & `PINECONE_INDEX` (for RAG)
   - `AI_MODEL` (optional, defaults to `anthropic/claude-sonnet-4`)
   - `NEXTAUTH_URL` etc. for auth if running in non‑localhost

2. **Adding hospital guidelines**
   - Use the Next.js form at `/app/api/ingest` or run one of the python scripts under `python/ingestion`.  Files are split into 1 000‑char chunks, embedded with `text-embedding-3-small`, and tagged with a `surgeryType` metadata filter.
   - After ingestion, `/api/chat` will pull context via `lib/rag.ts`.

3. **Onboarding reset / dev helpers**
   - Development components (`DevDateSwitcher`, `ForceStateGeneration`, `ForceOnboarding`) appear only when `NODE_ENV === 'development'`.
   - The onboarding flow can be wiped by calling the corresponding actions (`deleteBiometricsAction()`, etc.) or clicking the red buttons in `/info`.

4. **Debugging LLM outputs**
   - All outputs are run through Zod (`schemas/*`) and the helpers will `console.log()` prompts/results liberally.  Look at `lib/user/service.ts` and `lib/llm/service.ts` for examples.
   - `generateObject()` from the `ai` package is the standard pattern; giving it a `schema` causes it to wait for the full response and perform automatic validation.

5. **Prisma/DB tasks**
   - Migrations live in `prisma/migrations/`.  To introspect or generate new models run `npx prisma db pull` / `npx prisma migrate dev --name x`.
   - The custom adapter (`@prisma/adapter-pg`) is configured in `lib/prisma.ts`.

---
## Project‑Specific Conventions

* **Server actions**: any file that begins with `'use server'` exports functions callable from the client.  Most of those reside in `lib/actions.ts`; they always return `{ success: boolean; data?: T; error?: string }` and clients use `ensureAction()` (see `lib/utils.ts`) to unwrap.

* **Validation first**: database records read from Prisma are almost always run through a Zod schema (e.g., `StateSchema.parse(state)`).  Client components do the same when reading action results before using the data.

* **Onboarding conversation** lives under `app/(onboarding)/info/...`.  It is a five‑question process that builds a thread via conversions between `BaseQuestion`, `AssistantMessage`, and `UserMessage` (see `lib/external/schemas/message.ts`).  The thread is stored in Prisma and later used by `compileExternal()` to produce context for state generation.

* **Modular state**: the `State` object contains an array of `Module` entries (type strings like `'nutrition'`, `'exercise'`).  `getModuleFromState()` in `lib/utils.ts` is the helper to extract them for rendering.

* **Front‑end styling** is powered by Tailwind + `clsx` + `tailwind-merge` utilities (`cn()` helper).  Most UI pieces live in `components/ui` or `components/recovery`.

* **Environmental flagging**: guard development-only code with `process.env.NODE_ENV === 'development'`.  Examples are admin buttons on onboarding and dashboard pages.

* **Date logic**: the normalized date is used as a primary key for states.  `getNormalizedAppDate()` (in `lib/date-utils.ts`) returns the current simulated or real date for server‑side logic.

* **Authentication redirection**: Authentication is managed through specialized guard components (client-side) and server-side checks (layout wrappers). Each guard has a single responsibility:
  - **AuthGuard** (top-level wrapper) – ensures user is authenticated; redirects unauthenticated users to `/login`. Used in global layout.
  - **OnboardingGuard** (wraps `/app` routes) – ensures user has completed onboarding; redirects incomplete users to `/info`. Also redirects admins to `/admin` (since patient dashboard is not for admins). Used in `app/(app)/layout.tsx`.
  - **AdminGuard** (wraps `/admin` routes) – ensures user has admin role; redirects non-admins to `/`. Used in `app/(app)/admin/layout.tsx`.
  - **Server-side check** (in layout.tsx async components) – uses `await auth()` for initial server-side validation; redirects early if not authenticated.
  - **Pages are "dumb"** – individual pages (e.g., `page.tsx`) contain no redirect logic; they just render content. All routing decisions are delegated to parent guards/layouts.

---
## Integration Points & External Dependencies

- **Pinecone** for vector storage; index name from `PINECONE_INDEX`.
- **OpenAI embeddings** (`text-embedding-3-small`) used in the RAG pipeline (server and python scripts).  The LLM model for generation is configurable via `AI_MODEL`.
- **NextAuth** with PostgreSQL adapter via Prisma.  Credentials are hashed with `bcryptjs`.
- **AI SDK** (`ai` package) used for streaming chat (`streamText`) and structured output (`generateObject`).
- **LangChain** is pulled in for document loading, text splitting and embeddings in the ingest route, but all LLM calls currently use `ai.gateway`.

---
## Files & Locations to Reference

| Area | Representative files |
|------|----------------------|
| Auth & sessions | `auth.ts`, `types/next-auth.d.ts` |
| Server actions | `lib/actions.ts` |
| LLM schemas | `lib/llm/schemas/*`, `lib/user/baseline.ts` |
| State generation | `lib/state/service.ts`, `lib/state/graph/graph.ts` |
| RAG logic | `lib/rag/service.ts`, `lib/rag/client.ts`, `app/api/chat/route.ts` |
| Onboarding UI | `app/(app)/patient/info/*` |
| Admin system | `lib/auth-utils.ts`, `components/guards/AdminGuard.tsx`, `app/(app)/admin/*` |
| Route guards | `components/guards/` (AuthGuard, OnboardingGuard, AdminGuard) |
| Recovery components | `components/recovery/` (UserDashboard, DashboardRenderer, widgets) |
| Admin components | `components/admin/` (AdminDashboard, PatientDetailView) |
| Development tools | `components/development/` (DevDateSwitcher, ForceStateGeneration, ForceOnboarding) |
| Layout components | `components/layout/` (Sidebar) |
| Provider wrappers | `components/providers/` (Providers) |
| UI primitives | `components/ui/` (Button, Card, Input, etc.) |
| Utilities | `lib/utils.ts`, `lib/date-utils.ts` |
| MCP server | `mcp_server/src/index.ts`, `mcp_server/src/tools/` |

---

## MCP Server (`mcp_server/`)

An MCP (Model Context Protocol) server exposes the app's core capabilities as AI-callable tools.
It runs as a separate stdio process invoked by Claude Code via `.mcp.json` at the project root.

**Architecture:**
- Entry point: `mcp_server/src/index.ts`
- Tool modules: `mcp_server/src/tools/` (patient, planning, rag, context)
- Shared clients: `mcp_server/src/lib/client.ts` (re-exports `prisma` and Pinecone from parent)
- Package config: `mcp_server/package.json` (owns `@modelcontextprotocol/sdk`)

**Running the MCP server:**
```bash
# Development (run from project root)
npx tsx mcp_server/src/index.ts
# or via the package script
cd mcp_server && npm run dev
```

**Available tools:**
| Tool | Description |
|------|-------------|
| `get_patient_profile` | Patient demographics, biometrics, baseline, onboarding status |
| `get_patient_state` | Active recovery state + module progress for a given date |
| `generate_daily_state` | Trigger LangGraph pipeline to generate today's recovery plan |
| `update_module_progress` | Mark trackable items as done in a module |
| `get_patient_states_history` | List historical active states (trajectory review) |
| `search_guidelines` | Semantic search over Pinecone-indexed hospital guidelines |
| `get_onboarding_thread` | Retrieve onboarding conversation transcript |
| `get_compiled_external` | Retrieve frozen External snapshot used in state generation |
| `list_patient_threads` | List all threads for a patient with message counts |

**Key design constraints:**
- The MCP server does NOT use Next.js — no `"use server"`, no `auth()`, no `next/headers`
- `lib/date-utils.ts` uses a dynamic import for `next/headers` so it is safe to import outside Next.js
- `lib/state/service.ts` has no dependency on `lib/actions.ts` — graph nodes use services directly
- Path alias `@/` in MCP server source resolves to the project root (via `mcp_server/tsconfig.json` `baseUrl: ".."`)
- The MCP server inherits `DATABASE_URL` via dotenv in `lib/prisma.ts` (loads `.env.local`)

**Adding a new tool:**
1. Add the tool definition (name, description, inputSchema, handler) to the relevant file in `mcp_server/src/tools/`
2. Export it in the file's array (e.g., `patientTools`, `planningTools`)
3. Restart the MCP server — tools are auto-registered via `allTools` in `src/index.ts`

---
## Admin System (Doctor/Patient Tiers)

MGC2025 supports two user roles: `patient` (default) and `admin` (doctor). Admins can view and manage recovery data for assigned patients.

### Database Schema
- **UserRole enum**: `patient` or `admin` in `User.role`
- **AdminPatientRelation** join table: tracks which admin manages which patient
  - One admin can manage many patients
  - Patients have back-relation `managedByAdmin` (array of doctor records)
  - Unique constraint on `(adminId, patientId)` prevents duplicates

### Authentication & Permissions
- **Role assignment**: on signup, if email is in `ADMIN_EMAILS` env var (comma-separated), user is created with `role='admin'`; otherwise `role='patient'`
- **JWT strategy**: role is stored in JWT (via callback in `auth.ts`) and DB for performance; JWT is cryptographically signed so client tampering is cryptographically impossible
- **Permission utilities** in `lib/auth-utils.ts` (all marked `"use server"`):
  - `requireRole(role)` – throws if session role doesn't match
  - `requirePatientAccess(userId, targetPatientId)` – allows if user is patient OR admin managing them
  - `getAdminManagedPatientIds(adminId)` – fetches list of patient IDs for admin
- **All sensitive actions** in `lib/actions.ts` must call `requireRole()` or `requirePatientAccess()` before querying database

### Frontend Admin UI
- **AdminGuard** (`components/AdminGuard.tsx`): route guard checking `session.user.role === 'admin'`; redirects non-admins to home page or login
- **Admin routes** live under `app/(app)/admin/*` and are wrapped with `<AdminGuard>`
  - `/admin` – dashboard listing all managed patients with search/filter
  - `/admin/patients/[patientId]` – patient detail view with tabs (Overview, Progress, Threads, Baseline)
- **Data fetching** uses React Query with proper keys (`['admin', 'patients']`, `['admin', 'patient-details', ...]`); all calls routed through actions which enforce server-side permissions

### Configuration
Set in `.env.local`:
```
ADMIN_EMAILS=doctor@hospital.com,admin@example.com
```

### Extending Admin Features
When adding new admin-only actions:
1. Add action to `lib/actions.ts` and wrap with `authenticatedAction()`
2. Call `requireRole('admin')` or `requirePatientAccess()` before database access
3. Return `{ success: boolean; data?: T; error?: string }` following existing pattern
4. On client, use React Query with admin-scoped keys (e.g., `['admin', 'feature']`)
5. Protect route with `<AdminGuard>` if user-facing

---
## Component Architecture

All client-side UI and presentation logic is centralized in `components/` directory with a clear domain-based structure:

### Directory Structure
```
components/
├── ui/                     # Atomic UI primitives (Button, Card, Input, etc.)
├── guards/                 # Route guards (AuthGuard, OnboardingGuard, AdminGuard)
├── layout/                 # Site-wide layout wrappers (Sidebar)
├── recovery/               # Patient recovery dashboard components (UserDashboard, widgets)
├── admin/                  # Doctor/admin dashboard components (AdminDashboard, PatientDetailView)
├── development/            # Dev-only tools (DevDateSwitcher, ForceStateGeneration, ForceOnboarding)
├── providers/              # Root context providers (Providers)
└── REFACTOR_COMPONENTS.md  # Component organization guidelines
```

### "Dumb Pages" Pattern
- **Pages** (`app/**/page.tsx`) are **thin wrappers** that import and render a single component
- **Components** contain all JSX, hooks, data fetching, and business logic
- Example:
  ```tsx
  // app/(app)/admin/page.tsx — just 3 lines
  import { AdminDashboard } from "@/components/admin/AdminDashboard";
  export default function Page() {
    return <AdminDashboard />;
  }
  ```

### Component Organization Rules
- ✅ Extract components if a page file exceeds 100 lines
- ✅ Extract components if they're reused in 2+ places
- ✅ Keep UI primitives (`ui/`) for small, single-responsibility components
- ✅ Group domain-specific components by feature (recovery/, admin/)
- ❌ Don't embed complex JSX in page files
- ❌ Don't put routing logic in components (redirects belong in layouts)

---
## Writing New Code

* Follow existing patterns: use Zod for any JSON that crosses the server/client boundary or comes from an LLM.
* When adding new server logic, decide whether it belongs in `lib/actions.ts` (action used by client) or a more focused service file (`lib/user`, `lib/state`, etc.).  If it accesses `auth()`, put it in `actions.ts` and wrap with `authenticatedAction()`.
* Use `generateObject()` with a schema instead of raw `openai` calls; tests assume the LLM returns well‑formed JSON.
* Keep UI components small; reuse existing `ui/` components and respect the existing design system and naming conventions.
* There are no automated tests; assume you'll manually verify changes.

> **Note:** this document is intended to capture patterns that can be observed programmatically. If you encounter something that doesn't match, consider it a potential gap and ask the maintainer.
