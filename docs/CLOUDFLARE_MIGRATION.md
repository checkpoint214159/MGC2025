# Cloudflare Migration Plan — MGC2025

**Status:** Proposed
**Strategy:** Lift-and-shift (keep Postgres, Pinecone, OpenAI embeddings, Vercel AI Gateway; move compute to Cloudflare Workers)
**Target:** Next.js 16 on Cloudflare Workers via [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare)

---

## 1. Decisions (locked)

| Area                | Decision                                                                   | Rationale                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Hosting             | Cloudflare Workers + OpenNext adapter                                      | Only supported path for Next.js 16 App Router on CF (Pages adapter is legacy).                                                                                                                                                                                                                                                                                                                               |
| Database            | **Migrate Prisma Postgres → Neon**, reach it via **Cloudflare Hyperdrive** | Current DB is **Prisma Postgres (provisioned via Vercel)** — HTTP-first and **not a Hyperdrive-supported provider**, while the LangGraph `PostgresSaver` requires raw TCP Postgres. Neon is Hyperdrive-supported and Vercel-independent, so `@prisma/adapter-pg` **and** `PostgresSaver` both pool through Hyperdrive uniformly. One-time `pg_dump`/restore. Drop the unused `@prisma/extension-accelerate`. |
| LangGraph execution | Run in the Worker, checkpoint to Postgres via Hyperdrive                   | Interrupt/resume means no single request runs long. **Validated by a spike in Phase 0.**                                                                                                                                                                                                                                                                                                                     |
| Vectors / RAG       | Keep Pinecone + OpenAI embeddings (HTTP)                                   | Already HTTP-based, Workers-compatible as-is.                                                                                                                                                                                                                                                                                                                                                                |
| LLM                 | **OpenRouter** via `@openrouter/ai-sdk-provider` (HTTP)                    | Swapped off the Vercel AI Gateway. `OPENROUTER_API_KEY`.                                                                                                                                                                                                                                                                                                                                                     |

Optimize toward Cloudflare-native services (Vectorize, Workers AI, D1) **later**, not in this migration.

---

## 2. What this migration entails, in plain terms (read this first)

You're on **Vercel** today. Vercel is purpose-built for Next.js: you `git push`, it detects Next.js, builds it, and runs it for you — servers, scaling, routing, image optimization, the AI Gateway, and HTTPS all "just work" with almost no config. Cloudflare is more general-purpose, so a few things Vercel did invisibly become explicit steps. Nothing here is exotic; it's a well-trodden path. Here's each piece.

### 2.1 What actually runs your code: "Workers" instead of Vercel functions

-   On Vercel, your server code (server components, server actions, API routes) runs in **Vercel serverless/edge functions** — short-lived bits of compute Vercel spins up per request.
-   On Cloudflare, the equivalent is a **Worker**: a single deployable unit of JavaScript that runs on Cloudflare's edge network, close to users, with no server for you to manage. One Worker will serve your whole Next.js app.
-   A Worker is **not a Node.js server**. It runs on a lighter JavaScript runtime (V8 isolates). Most Node APIs are available _only_ when you turn on a compatibility switch (`nodejs_compat`), and a few Node-heavy libraries still won't work (this is exactly why the PDF-parsing `/api/ingest` route is a question mark — see §6).
-   Practical consequence: there's no "always-on server," no ports, no nginx. You hand Cloudflare a bundle and it runs it on demand.

### 2.2 How Next.js gets onto a Worker: the OpenNext adapter

-   Vercel understands Next.js natively. Cloudflare does **not** — it doesn't know what `app/` routes, server actions, or the App Router are.
-   **OpenNext** (`@opennextjs/cloudflare`) is the translator. It takes the standard `next build` output and repackages it into something a Worker can run. You add it once; from then on your build command is "build with Next, then adapt with OpenNext."
-   You keep writing normal Next.js. OpenNext is a build-time wrapper, not a rewrite of your app.

### 2.3 How you deploy: `wrangler` instead of `git push`

-   **Wrangler** is Cloudflare's command-line tool (the equivalent of the Vercel CLI). `wrangler deploy` uploads and publishes your Worker. `wrangler dev` runs it locally in a real Worker-like runtime.
-   You can also wire up **Workers Builds** (Cloudflare's git integration) so a `git push` auto-builds and deploys, recreating the Vercel "push to ship" feel. We'll start with manual `wrangler deploy` and add git-based deploys once it's stable.

### 2.4 The configuration file: `wrangler.toml` and "bindings"

-   Vercel keeps config mostly in its dashboard. Cloudflare keeps it in a file in the repo: **`wrangler.toml`** (or `wrangler.jsonc`). It declares the Worker's name, the compatibility flags (e.g. `nodejs_compat`), and its **bindings**.
-   A **binding** is Cloudflare's word for "a resource this Worker is allowed to use," injected into your code at runtime. Examples we'll use: a **Hyperdrive** binding (the database connection — see next), and **secrets** (API keys). Instead of reading a raw connection string from the environment, the Worker receives these as bindings.

### 2.5 The database: why we need **Hyperdrive**

-   This is the biggest conceptual difference, so read carefully. Your Postgres database speaks a raw **TCP** protocol. Traditional servers (and Vercel's Node functions) can open a TCP socket straight to Postgres. **Workers cannot open arbitrary TCP connections** to a database the normal way, and even if they could, Cloudflare runs your code in thousands of tiny isolates worldwide — each opening its own DB connection would instantly exhaust Postgres's connection limit.
-   **Hyperdrive** is Cloudflare's solution: a managed service that sits between your Worker and your Postgres. It (a) gives the Worker a way to reach Postgres, (b) **pools** connections so thousands of Worker invocations share a small, safe number of real DB connections, and (c) caches connections globally to cut latency.
-   In practice: you create a Hyperdrive config pointing at a Postgres database, add it as a binding, and your code reads the connection string **from that binding**. Your Prisma setup (`@prisma/adapter-pg`) and the LangGraph Postgres checkpointer keep working — they just point at Hyperdrive's connection string instead of the database directly.
-   **Caveat for this project:** your current DB is **Prisma Postgres** (provisioned via Vercel), which is HTTP-first and _not_ a Hyperdrive-supported provider, while the LangGraph checkpointer needs raw TCP Postgres. So we do a one-time data migration to **Neon** (a Hyperdrive-supported, Vercel-independent Postgres) — after that the Hyperdrive story above applies uniformly. See §1 and Phase 2.

### 2.6 Environment variables and secrets

-   On Vercel you set env vars in the dashboard. On Cloudflare, non-secret values can go in `wrangler.toml`, and secrets (API keys, DB URLs) are set with `wrangler secret put NAME` (or in the dashboard) and delivered to the Worker as bindings.
-   For local development you put the same values in a git-ignored `.dev.vars` file, which `wrangler dev` reads.

### 2.7 The LLM provider — DONE (Vercel AI Gateway → OpenRouter)

-   Originally LLM calls went through the **Vercel AI Gateway** (`gateway(...)`), which auto-authenticates _only_ on Vercel (OIDC). Off Vercel that breaks.
-   **Resolved:** swapped to **OpenRouter** via `@openrouter/ai-sdk-provider@^1` (pinned to v1 for AI SDK v5 compatibility). `lib/llm/model.ts` now uses `createOpenRouter`, and `app/api/chat/route.ts` uses `getModel()` too. Set **`OPENROUTER_API_KEY`** (env / Cloudflare secret). Model slugs are OpenRouter naming via `AI_MODEL` / `CHAT_MODEL`.

### 2.8 Domains and HTTPS

-   Vercel manages your domain and TLS certificate for you. On Cloudflare, you map a **custom domain / route** to the Worker. Cloudflare also issues TLS automatically — but the domain's DNS needs to be managed by Cloudflare (you move the domain's nameservers to Cloudflare if they aren't already). Cutover is then just repointing the domain from Vercel to the Worker.

### 2.9 Limits and why we spike first

-   Workers have a **CPU-time budget per request** (raised on the paid plan). I/O waiting (DB, LLM calls) generally doesn't count against CPU time, but heavy synchronous compute does.
-   Your LangGraph onboarding/state graphs are the one place this could bite, which is why Phase 0 is a measurement spike before we commit. Everything else in the app is light request/response work that fits comfortably.

### 2.10 Local development

-   `next dev` still works for normal day-to-day UI work.
-   `wrangler dev` runs the app in a Worker-accurate runtime — use it to catch Worker-only issues (Node-compat, bindings, Hyperdrive) before deploying.

### 2.11 What does _not_ change

Your application code, Next.js features, Prisma schema, Postgres data, Pinecone index, LLM prompts/models, and auth logic all stay the same. The migration is mostly **packaging, configuration, and the database connection path** — not a rewrite.

---

## 3. Current architecture (what we're moving)

-   **Framework:** Next.js 16 App Router, React 19. Mostly server components + server actions; API routes: `/api/chat`, `/api/ingest`, `/api/auth/[...nextauth]`, `/api/auth/signup`, `/api/admin/graph-config`.
-   **Hosting today:** **Vercel** (the app's first/current deployment platform). No `vercel.json`, no crons, no `next/image`, no `@vercel/*` SDKs — the only meaningful Vercel coupling is the **AI Gateway** (zero-config on Vercel via OIDC) and the deploy pipeline itself. The `.platform/nginx/` files in the repo are stale leftovers from an abandoned AWS Elastic Beanstalk attempt and are not in use.
-   **DB:** **Prisma Postgres** (provisioned via Vercel), Prisma 7 with `@prisma/adapter-pg` (raw TCP via `pg`). Generated client in `generated/prisma`. `@prisma/extension-accelerate` is a dependency but `lib/prisma.ts` uses the pg adapter directly. → Migrating to **Neon** (see Phase 2).
-   **Auth:** NextAuth v5 (beta) Credentials provider, JWT session strategy, `bcryptjs`. JWT callback queries Prisma for role/onboarding flags.
-   **LLM:** Vercel AI SDK `ai` package via `gateway(modelId)` (`lib/llm/model.ts`); default `anthropic/claude-sonnet-4`, chat route pins `deepseek/deepseek-v3.2`.
-   **RAG:** OpenAI `text-embedding-3-small` + Pinecone hybrid search + reranking (`lib/rag/`).
-   **Orchestration:** LangGraph v1 (`@langchain/langgraph`) for onboarding (`lib/onboarding/graph/`) and state generation (`lib/state/graph/`). Onboarding uses a **`PostgresSaver` checkpointer** (`lib/onboarding/graph/checkpointer.ts`) that runs `setup()` DDL and persists interrupt/resume state in the same Postgres DB.
-   **Ingest:** `/api/ingest` loads PDFs with LangChain `PDFLoader` + `pdf-parse` (Node-flavored) on uploaded blobs, embeds to Pinecone. `maxDuration = 60`.
-   **Graph config:** `lib/state/graph/config.ts` is DB-backed (`GraphConfig` table) with a 1-minute in-memory cache — cache is just a perf optimization, DB is source of truth (Workers-safe).
-   **Python:** offline Google-Drive→Pinecone/Upstash ingestion under `python/` — **out of scope**, runs independently of the web runtime.

---

## 4. Compatibility assessment

| Component                                  | Workers compatibility                                                    | Action                                                                                                                                                          |
| ------------------------------------------ | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js 16 App Router, RSC, server actions | ✅ via OpenNext + `nodejs_compat`                                        | Add adapter.                                                                                                                                                    |
| Prisma 7 + `adapter-pg`                    | ✅ driver-adapter client is Workers-compatible (no native engine binary) | Point `pg` at Hyperdrive connection string.                                                                                                                     |
| Postgres TCP from Worker                   | ⚠️ not directly                                                          | **Hyperdrive** binding provides the pooled connection string.                                                                                                   |
| LangGraph `PostgresSaver`                  | ⚠️ uses node `pg` + DDL `setup()`                                        | Connect via Hyperdrive; **move `setup()` out of the request path** (run once as a migration).                                                                   |
| NextAuth v5 + `bcryptjs`                   | ✅ pure-JS bcrypt, JWT strategy works                                    | Set `AUTH_SECRET`, `trustHost: true`.                                                                                                                           |
| AI SDK `gateway()` / `streamText`          | ✅ HTTP + streaming work on Workers                                      | Move keys to secrets.                                                                                                                                           |
| Pinecone + OpenAI embeddings               | ✅ HTTP                                                                  | Move keys to secrets.                                                                                                                                           |
| `/api/ingest` PDFLoader + `pdf-parse`      | ❌/⚠️ Node fs + binary parsing, risky on Workers                         | See §6 — isolate, or move ingestion fully to the Python pipeline.                                                                                               |
| `process.env` access (15 files)            | ⚠️ runtime env comes from Worker bindings                                | OpenNext shims `process.env` from the Worker `env`; verify dotenv-only paths (`prisma.config.ts`, `lib/prisma.ts` `import "dotenv/config"`) are build/CLI-only. |
| In-memory caches / module globals          | ✅ (config cache is DB-backed)                                           | No durable in-memory state relied upon.                                                                                                                         |
| OpenRouter (`@openrouter/ai-sdk-provider`) | ✅ HTTP, Workers-friendly                                                | DONE — replaced the Vercel AI Gateway. Set `OPENROUTER_API_KEY`.                                                                                                |
| `maxDuration` route exports                | ⚠️ Vercel-specific, ignored by Workers                                   | Harmless to leave; Workers enforce their own limits instead.                                                                                                    |
| `.platform/nginx/*` (stale EB files)       | n/a                                                                      | Delete; never in use.                                                                                                                                           |

---

## 5. Phased plan

### Phase 0 — De-risk spike (do first, ~0.5–1 day)

The one real unknown is whether the LangGraph onboarding/state graphs fit within Workers' CPU limits when resuming/advancing per request.

1. Stand up a throwaway Worker (or `wrangler dev`) that:
    - Connects to a dev Postgres through Hyperdrive (or `wrangler dev` local).
    - Runs a single onboarding graph step (load → generate question → interrupt) and a state-generation dispatch.
2. Measure CPU time vs wall-clock per invocation. Workers paid plan allows raised CPU limits; confirm the heaviest single step (a `generateObject`/module node) returns at an interrupt without exceeding limits.
3. **Exit criteria:** every individual graph advance completes within CPU budget. If not → pivot that subsystem to Cloudflare Workflows / a Durable Object (separate mini-plan), keeping the rest of this plan intact.

### Phase 1 — Local Workers build (no infra changes) — ✅ scaffolding DONE

1. ✅ Added deps: `@opennextjs/cloudflare@^1.19.11`, `wrangler@^4.103.0` (dev), `@cloudflare/workers-types` (dev).
2. ✅ Added `wrangler.jsonc`: `compatibility_date 2025-04-05`, `compatibility_flags ["nodejs_compat"]`, `main .open-next/worker.js`, `ASSETS` binding. (Hyperdrive binding stubbed in comments for Phase 2.)
3. ✅ Added `open-next.config.ts` (default config).
4. ✅ Added scripts: `cf:build`, `cf:preview`, `cf:deploy`, `cf:typegen`. Added `.dev.vars.example`; `.gitignore` updated for `.open-next/`, `.wrangler/`, `.dev.vars`, `cloudflare-env.d.ts`. Added `initOpenNextCloudflareForDev()` to `next.config.ts`.

**Pre-existing blockers found & fixed while getting the build to run (NOT Cloudflare-caused — they broke `next build` on Vercel too):**

-   **LangChain dep skew:** `@langchain/core` was pinned at `1.1.11` but `@langchain/openai`/`@langchain/community`/langgraph require `^1.1.36`; the old core lacked subpath exports (`@langchain/core/errors`, `/utils/standard_schema`, …). Bumped `@langchain/core` → `^1.2.0`. (One residual npm warning: the `langchain` meta-package hard-pins core `1.1.9`; harmless — 1.2.0 is a compatible superset.)
-   **TS type error** in `lib/state/graph/annotation.ts:71`: a reducer annotated `incoming: State` under an `Annotation<State | null>`, narrower than LangGraph's `BinaryOperator`. Dropped the annotation to match the sibling `external` reducer. After this, **`next build` passes fully** (compile + type-check + static gen).

**Remaining blocker = the Phase 2 DB driver, surfaced early.** `opennextjs-cloudflare build` gets through `next build` and into Worker bundling, then fails:

> `Could not resolve "pg-cloudflare"` … `dist/index.js` not found.

Root cause: OpenNext's file tracer (NFT) runs under **Node** conditions, so it resolves `pg-cloudflare`'s `default` export (`dist/empty.js`) and copies only that; the final esbuild bundle runs under the **`workerd`** condition, which wants `dist/index.js` (the real Cloudflare-socket impl). `pg` is pulled in by both `@prisma/adapter-pg` (`lib/prisma.ts`) and the LangGraph `PostgresSaver`. Forcing the build green via `useWorkerdCondition: false` would bundle the _empty_ stub and break the DB socket at runtime — so this must be solved properly in Phase 2 (with Hyperdrive), not hacked. **This is the natural Phase 1→2 handoff point.**

Also note (separate, pre-existing): `prisma generate` fails under the branch's `prisma@6.19.3` CLI because `prisma.config.ts` uses the Prisma-7-style `datasource.url` and the schema has no `url = env(...)`; the CLI/`@prisma/client` versions are mismatched (CLI 6 vs client 7). The committed `generated/prisma` client let `next build` proceed, but `cf:build`'s `prisma generate` step needs this version mismatch resolved.

### Phase 2 — Data plane: migrate to Neon + Hyperdrive

**DB decision: migrate Prisma Postgres → Neon** (Hyperdrive-supported + Vercel-independent), keep `@prisma/adapter-pg`, pool everything through Hyperdrive.

0. **Resolve the `pg-cloudflare` bundling error from Phase 1** (the current build blocker). `pg` is pulled in by both `@prisma/adapter-pg` and the LangGraph `PostgresSaver`, so this is needed regardless. Ensure the `workerd` build of `pg-cloudflare/dist/index.js` is bundled (the NFT-vs-esbuild condition mismatch), confirm recent `pg`/OpenNext handles it, and verify `pg` opens a socket over Hyperdrive.
1. **Provision Neon** (free tier is fine to start). Create a project/branch; capture its `postgres://` connection string (use the **direct**, non-pooled string for Hyperdrive — Hyperdrive does its own pooling).
2. **Migrate data Prisma Postgres → Neon:** `pg_dump` from the current Prisma Postgres direct connection, restore into Neon. Run `prisma migrate deploy` against Neon to confirm schema parity (then load data, or load then verify). Validate row counts.
3. **Create the Hyperdrive config** pointing at the Neon connection string. Add the `HYPERDRIVE` binding to `wrangler.jsonc`.
4. In `lib/prisma.ts`, source the connection string from the Hyperdrive binding's `connectionString` (via OpenNext `getCloudflareContext().env`) with a `process.env.DATABASE_URL` fallback for `next dev`/CLI. Drop the unused `@prisma/extension-accelerate`.
5. **LangGraph checkpointer:** pass the same Hyperdrive-backed connection string to `PostgresSaver.fromConnString(...)`. Remove `await saver.setup()` from the request path — run it once as a one-off step (create the checkpoint tables in Neon ahead of deploy).
6. Confirm Prisma migrations + LangGraph checkpoint tables coexist in Neon (they share one DB, as today).
7. **Decommission:** once verified, delete the Prisma Postgres database and detach the Vercel↔Prisma integration so nothing is left billing on Vercel.

### Phase 3 — Auth, secrets, env

1. Move all secrets out of the Vercel dashboard into `wrangler secret put` / the Cloudflare dashboard: `DATABASE_URL` (or Hyperdrive only), `AUTH_SECRET`, **`AI_GATEWAY_API_KEY`** (new — required off Vercel; create it in the Vercel AI Gateway dashboard), `OPENAI_API_KEY`, `PINECONE_API_KEY`, `PINECONE_INDEX`, `ADMIN_EMAILS`, any `RAG_*` tuning vars, `AI_MODEL`.
2. NextAuth: set `AUTH_SECRET`, `trustHost: true`, and the correct base URL for the Workers domain. Verify the JWT callback's Prisma queries work under the Worker (they run on each session refresh).
3. Audit the 15 `process.env` reads to confirm each resolves at runtime under OpenNext (vs. being dotenv-only build paths).

### Phase 4 — Ingest route decision (see §6)

Pick one: isolate `/api/ingest` behind `nodejs_compat` and test, **or** mark it offline-only and route document ingestion through the existing Python pipeline. Recommended: offline-only for now to avoid blocking the cutover on PDF-parsing compatibility.

### Phase 5 — Staging deploy + verification

1. `wrangler deploy` to a `*.workers.dev` (or staging route).
2. End-to-end verification: signup/login (bcrypt + JWT), onboarding graph (interrupt → resume → baseline/profile), state generation, admin routes + `/api/admin/graph-config`, `/api/chat` streaming with RAG context, Pinecone retrieval.
3. Load/latency check, especially DB round-trips through Hyperdrive and graph step CPU.

### Phase 6 — Cutover (off Vercel)

1. Add the production custom domain/route in Cloudflare; if the domain's DNS isn't already on Cloudflare, move the nameservers to Cloudflare first.
2. Repoint the domain from Vercel to the Worker (low DNS TTL first).
3. Monitor (Workers logs/analytics, error rate, DB connections via Hyperdrive).
4. Keep the Vercel deployment live as rollback for one cycle, then decommission: delete the Vercel project, remove `.platform/` (stale EB files) and `.vercel/`.

---

## 6. Concrete code/repo changes

-   **New:** `wrangler.toml`, `open-next.config.ts`, `.dev.vars` (gitignored local secrets), `docs/CLOUDFLARE_MIGRATION.md` (this file).
-   **`package.json`:** add `@opennextjs/cloudflare`, `wrangler`, `@cloudflare/workers-types`; add `preview`/`deploy` scripts; ensure `prisma generate` in build.
-   **`lib/prisma.ts`:** read connection string from Hyperdrive binding with `DATABASE_URL` fallback.
-   **`lib/onboarding/graph/checkpointer.ts`:** Hyperdrive connection string; move `setup()` to a one-off migration step.
-   **`next.config.ts`:** add the OpenNext/Cloudflare dev initialization hook if required by the adapter version.
-   **`/api/ingest`:** isolate or deprecate per §6.
-   **Remove (Phase 6):** `.platform/` nginx configs (stale EB leftovers) and `.vercel/`; delete the Vercel project.
-   **`.gitignore`:** add `.open-next/`, `.wrangler/`, `.dev.vars`.

---

## 7. Risks & open items

1. **LangGraph CPU budget (highest risk).** Mitigated by the Phase 0 spike. Fallback: move the graph to Cloudflare Workflows / Durable Object.
2. **`/api/ingest` Node dependencies** (`pdf-parse`, LangChain fs `PDFLoader`). Likely the least Workers-friendly code. Preferred: keep ingestion offline (Python pipeline already exists) and drop the runtime route, or move it to a small separate Node service. Don't let it block the web cutover.
3. **Hyperdrive + Postgres connection limits.** Hyperdrive pools, but confirm the upstream Postgres `max_connections` and that both Prisma and the LangGraph saver share pooling sanely.
4. **`PostgresSaver.setup()` DDL on the hot path.** Must be moved to a one-off step — running DDL per cold start is unacceptable on Workers.
5. **next-auth v5 is beta.** Verify Workers behavior (cookies, `trustHost`, base URL) on staging before cutover.
6. **AI Gateway provider.** Vercel AI Gateway is fine over HTTP from Workers; if it ever becomes a concern, Cloudflare AI Gateway is a drop-in HTTP swap (deferred, not in scope).
7. **Streaming duration.** `/api/chat` streaming is fine on Workers, but confirm long streams don't trip limits under load.

---

## 8. Out of scope (future "native" phase)

-   Pinecone → Cloudflare **Vectorize**
-   OpenAI embeddings / LLM → **Workers AI** + Cloudflare **AI Gateway**
-   Postgres → **D1** (would require schema + checkpointer rework)
-   R2 for uploaded documents/assets
