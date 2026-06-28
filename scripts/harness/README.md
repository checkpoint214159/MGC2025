# Dev harness (Phase 0 + 1)

A feedback loop so an agent (or you) can change the app, then **see whether it actually
works** — without hand-pasting dev-server logs. Built because every failure in this app so
far (Neon-HTTP transaction crashes, `setState`-in-render, broken seeds) was only visible by
watching the terminal.

## The two-terminal workflow

```bash
# Terminal 1 — run the app with its logs captured to a file the harness can read
npm run dev:logged          # next dev, teed to .dev/server.log

# Terminal 2 — verify + drive
npm run check               # static gate: typecheck + lint(changed) + unit tests
npm run harness             # seed a patient, log in, drive authed routes, scan logs
npm run harness:scan        # scan .dev/server.log for known failure patterns
```

`.dev/` is gitignored.

## What each piece does

| Command                         | What it checks                                                                                                                                                                                                        | Cost          |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| `npm run check`                 | `tsc --noEmit` (whole project, `.next/` noise filtered) + ESLint (only **changed** files — see below) + `vitest run`. Exits non-zero on any failure.                                                                  | free, fast    |
| `npm run harness`               | Seeds/reuses a fixed harness patient via `POST /api/dev/seed-patient`, logs in through the real Auth.js credentials flow, then GETs authed routes asserting `200` + scanning the **log delta** each request produced. | free (no LLM) |
| `npm run harness:scan [offset]` | Greps `.dev/server.log` (optionally from a byte offset) for the failure watchlist.                                                                                                                                    | free          |

**Lint scope:** `check` lints only what changed (explicit file args win, else the uncommitted
working set vs `HEAD` + untracked). The legacy codebase has lots of pre-existing lint debt;
gating the loop on the whole repo would be permanently red. Pass exact files for precision:
`node scripts/harness/check.mjs path/to/file.tsx`.

## The failure watchlist

Lives in [`_shared.mjs`](./_shared.mjs) — regexes grown from **real bugs this app has hit**:
Neon-HTTP transaction errors, `unhandledRejection`, `Cannot update a component` (setState in
render), `[prisma] … ❌`, Prisma validation errors, hydration mismatches, state-gen/LLM errors.
**Add to it whenever a new failure mode appears** — that's how the loop remembers.

## Limits (be honest about these)

-   **Server-side only.** `curl` runs no JS, so the journey driver catches SSR/RSC/route/action
    crashes, 500s, and prisma errors — **not** client-only React warnings (those reach the log as
    `[browser]` lines only when a real browser with the dev client is connected). Browser-level
    driving (Playwright / Chrome-DevTools MCP) is a later phase.
-   **No data-loaded assertions.** A dashboard GET returns the client shell; the data renders
    after client-side queries. The smoke confirms the route serves without server error, not that
    the populated UI is correct.
-   **LLM flows are out of the tight loop.** Onboarding questions and state generation call the
    model (cost + nondeterminism). The harness patient is pre-seeded (no LLM) on purpose. Fixture
    mode for deterministic full flows is Phase 2.

## Extending

-   **New journey:** add an entry to the `journeys` array in [`journey.mjs`](./journey.mjs).
-   **New failure pattern:** add a regex to `WATCHLIST` in [`_shared.mjs`](./_shared.mjs).
-   **Mutations (e.g. log pain):** server actions aren't curl-able; add a thin dev route that
    calls the service fn, then drive it (same shape as `seed-patient`).

## Bugs this harness already caught while being built

-   `seedPatient()` crashed on Neon HTTP: nested message-array create **and** nested
    account-create-with-`include` both transact. Fixed to single-row writes.
-   Confirms the earlier `seedPatientMemory` empty-`update` upsert fix and the `router.push`
    -in-render fix stay green.
