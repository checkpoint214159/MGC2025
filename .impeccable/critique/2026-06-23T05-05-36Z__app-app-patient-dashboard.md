---
target: patient/dashboard
total_score: 22
p0_count: 0
p1_count: 3
timestamp: 2026-06-23T05-05-36Z
slug: app-app-patient-dashboard
---

# Critique — patient/dashboard

## Design Health Score

| #         | Heuristic                       | Score     | Key Issue                                                                                                   |
| --------- | ------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------- |
| 1         | Visibility of System Status     | 2         | Full-screen spinner (not skeleton); no save confirmation on log cards; mock cards display fake "live" state |
| 2         | Match System / Real World       | 3         | CareTeamCard copy is excellent plain language; "Retrieving goodies…" tone is off for a clinical app         |
| 3         | User Control and Freedom        | 2         | Clickable cards that do nothing (`onClick={() => {}}`); no undo on logging                                  |
| 4         | Consistency and Standards       | 1         | Two entire design languages collide in one view — tokenized calm system vs. hardcoded floating-card slop    |
| 5         | Error Prevention                | 2         | `onClick` on a non-focusable `<div>`; no query error state                                                  |
| 6         | Recognition Rather Than Recall  | 3         | Labels present, icons paired with text                                                                      |
| 7         | Flexibility and Efficiency      | 2         | Adequate for audience; nothing notable                                                                      |
| 8         | Aesthetic and Minimalist Design | 2         | Top half clean; bottom half cluttered, redundant, floating                                                  |
| 9         | Error Recovery                  | 2         | Good empty states; no error branch if the data query fails                                                  |
| 10        | Help and Documentation          | 3         | CareTeamCard red-flag disclosure is genuinely excellent contextual help                                     |
| **Total** |                                 | **22/40** | **Acceptable (low end) — significant work before users are well served**                                    |

## Anti-Patterns Verdict

**Yes, the bottom half looks AI-generated; the top half does not.**

The page is two designers stitched together. The redesigned hero stack (TodayHero, RecoveryProgressChart, RecoveryArc, CareTeamCard, primitives) is genuinely strong, tokenized product UI. Below "Log today," DashboardRenderer mounts the old preview cards which carry nearly every tell: side-stripe borders, hardcoded rainbow palette, `font-black`, tiny uppercase slate-400 micro-labels, a giant decorative ghost icon, and permanent `-translate-y-2 shadow-xl` float.

**Deterministic scan:** detector found `side-tab` (`border-l-4`) in `components/ui/DashboardUtils.tsx:31` and `:35` (the class is duplicated), imported by all four preview cards (Exercise, Nutrition, Sleep, Symptoms) — the single most recognizable AI tell, an absolute ban. Also flagged `border-accent-on-rounded` at `RealPatientDashboard.tsx:45` — false positive; that's the loading spinner's `border-b-2`, not a card.

## Priority Issues

-   **[P1] Two design systems in one page.** RealPatientDashboard renders tokenized components then drops DashboardRenderer's hardcoded-palette cards between them. Consistency is the worst heuristic (1/4). Fix: rebuild the log cards on the existing primitives (Card, Chip, ProgressBar, semantic tokens), or replace the grid with the existing ExpandablePriorityCard pattern. Retire DashboardCard/DashboardUtils.
-   **[P1] Side-stripe borders + hardcoded palette (absolute ban).** `border-l-4` + `bg-blue-100/orange/amber/green/yellow` ignore the token system. Fix: delete the side stripe; map every color to semantic tokens (accent/progress/attention/critical).
-   **[P1] Mock data presented as real in a clinical app.** SymptomsPreviewCard ("Low (2/10)", "Right Knee") and SleepPreviewCard are fully hardcoded; both passed `data={{}}` with dead `onClick`. NutritionPreviewCard ships `console.log` statements. In a recovery app, fake clinical numbers are a trust/safety problem, not just polish. Fix: wire to real State or hide until data exists.
-   **[P2] Content redundancy / IA.** TodayHero already lists the 3 priorities (exercise, nutrition) with links; "Log today" then re-presents the same modules as large cards plus two hardcoded extras. Decide one home for each action.
-   **[P2] Accessibility regressions in old cards.** `onClick` on a `<div>` (not keyboard-focusable, no role); 10px `text-slate-400` uppercase labels fail contrast/legibility for the stated older-patient audience. New components already do this right (Links/buttons, min-h-11, aria-labels).

## Persona Red Flags

**Sam (accessibility):** Old preview cards are click-only `<div>`s — not reachable or operable by keyboard; no focus state. 10px slate-400 micro-labels fail 4.5:1. The new components (TodayHero rows, CareTeamCard, SVG aria-labels) are exemplary by contrast.

**Margaret (68, post-op cancer patient — project persona):** Reassured by the calm hero and the "Not feeling right?" card, then hits a wall of bright, busy, floating cards showing numbers she didn't enter ("Low (2/10)"). Confusion about what's real vs. example; possible alarm.

**Riley (stress tester):** Cards that look live but render hardcoded values; two cards whose click does nothing; no error state if the data query fails (only loading → render). Refresh mid-state is fine, but a failed fetch silently degrades to "No records found."

## Minor Observations

-   Sibling section headings disagree in size (h2 at 15px vs 19px); pick one scale.
-   Loading uses a spinner; product convention here is skeleton states.
-   `data: any` typing in DashboardCard/Exercise/Symptom cards.
-   TodayHero's visual hero (52–60px Day number) is not the semantic h1 (the 17px greeting is) — acceptable but worth a sweep.

## Questions to Consider

-   Should "Log today" and the hero's "3 priorities" be the same surface rather than two?
-   What would the log cards look like built entirely from the existing primitives — does the grid even survive?
-   Should symptoms/sleep exist at all until they have real data behind them?
