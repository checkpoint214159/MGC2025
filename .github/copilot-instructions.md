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

* **Authentication redirection**: `AuthGuard` (client component) checks session status and `doneOnboarding` and pushes users to `/login` or `/info`.  Public routes are defined in `AuthGuard`.

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
| State generation | `lib/state/service.ts`, `lib/state/services/full.ts` |
| RAG logic | `lib/rag.ts`, `app/api/chat/route.ts`, `app/api/ingest/route.ts` |
| Onboarding UI | `app/(onboarding)/info/*`, `components/admin/ForceOnboarding.tsx` |
| Providers & context | `components/Providers.tsx`, `context/DateContext.tsx` |
| Utilities | `lib/utils.ts`, `lib/date-utils.ts` |

---
## Writing New Code

* Follow existing patterns: use Zod for any JSON that crosses the server/client boundary or comes from an LLM.
* When adding new server logic, decide whether it belongs in `lib/actions.ts` (action used by client) or a more focused service file (`lib/user`, `lib/state`, etc.).  If it accesses `auth()`, put it in `actions.ts` and wrap with `authenticatedAction()`.
* Use `generateObject()` with a schema instead of raw `openai` calls; tests assume the LLM returns well‑formed JSON.
* Keep UI components small; reuse existing `ui/` components and respect the existing design system and naming conventions.
* There are no automated tests; assume you'll manually verify changes.

> **Note:** this document is intended to capture patterns that can be observed programmatically. If you encounter something that doesn't match, consider it a potential gap and ask the maintainer.
