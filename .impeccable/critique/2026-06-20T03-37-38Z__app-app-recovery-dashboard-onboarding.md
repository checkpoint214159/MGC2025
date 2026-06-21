---
target: recovery dashboard + onboarding/auth
total_score: 21
p0_count: 1
p1_count: 2
timestamp: 2026-06-20T03-37-38Z
slug: app-app-recovery-dashboard-onboarding
---
# Critique — Recovery dashboard + onboarding/auth

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Dashboard has skeletons + "Updated"; onboarding uses banned mid-content spinners/bounce; LLM-phase progress pips have no "x of y". |
| 2 | Match System / Real World | 2 | Patient-facing onboarding surfaces "FRAMEWORK: WHO-ICF", ICF domain codes, "Clinical Path", "Confirm Score", "Next Metric" — clinician language. |
| 3 | User Control & Freedom | 2 | LLM question flow has no Back / no edit of a prior answer; auth has no password reset / show-password. |
| 4 | Consistency & Standards | 1 | Headline failure: two parallel design systems (on-token dashboard vs raw blue-600/slate onboarding+auth), two Buttons, two Cards. |
| 5 | Error Prevention | 2 | Dev `alert()` with internal var names ships to patient (BaselinePage:101); biometrics hardcodes weightKg:70/heightCm:170. |
| 6 | Recognition vs Recall | 3 | Dashboard strong; onboarding Q&A makes you recall prior answers (history.slice(-2), no edit). |
| 7 | Flexibility & Efficiency | 2 | No keyboard accelerators; thin but acceptable for cohort. |
| 8 | Aesthetic & Minimalist | 3 | Dashboard clean; onboarding over-decorates (shadow-2xl, font-black, text-6xl, mono eyebrows). |
| 9 | Error Recovery | 2 | BaselinePage error+retry is the best in the app; login "Something went wrong" is generic; alert() unrecoverable-feeling. |
| 10 | Help & Documentation | 1 | No contextual help, tooltips, "why are we asking this", or support link anywhere. |
| **Total** | | **21/40** | **Acceptable** — dashboard ~31 (Good) blended down by onboarding/auth ~15 (Poor). |

## Anti-Patterns Verdict

**LLM assessment:** Onboarding + auth **fail the slop test** — textbook generic indigo-Tailwind SaaS, the exact anti-reference PRODUCT.md defines against: `rounded-[2.5rem] shadow-2xl shadow-blue-100/50` cards, `text-6xl font-black text-blue-600` numerals on a pain slider, tracked-uppercase mono eyebrows, `animate-bounce "AI is thinking"`. The **dashboard passes** — restrained petrol accent, borders-not-shadows, color paired with text labels, real skeletons/empty states.

**Deterministic scan (detect.mjs):** 2 warnings, both on `app/(app)/patient/info/page.tsx`: `border-accent-on-rounded` (border-b-2 blue tab, line 140) and `bounce-easing` (animate-bounce, line 149). Both corroborate the review. The detector does NOT flag raw `blue-600`/`slate` as slop (not a static rule), so the design-system split is an LLM-only finding.

**Visual overlays:** Not available — no browser automation in this environment; detector run on source only.

## Overall Impression

The dashboard proves the team can hit "calm, clinical, kind." But a patient meets it **last**. The trust-critical first-run surfaces (auth → biometrics → baseline → Q&A) are the least finished and currently *are* the generic-blue anti-reference. Single biggest opportunity: close the consistency split before any dashboard refinement.

## What's Working

1. **StreakRing** (primitives.tsx) — 7 discrete segments, butt↔round cap at 7, "Keep it gentle / Well held" copy (not "🔥"), aria-label "N of 7", number+label so it's never color-alone. The brief executed precisely.
2. **Color is never status-alone on the dashboard** — completed priorities get check glyph + line-through + muted text; intensity chips carry words ("Pause if pain"/"Cautious"/"Easy"). Color-blind safe.
3. **Cohort load budget respected** — 3 priorities max, full plan disclosed below, real DashboardSkeleton, 44px dismiss targets. BaselinePage's error+retry is the best-written failure in the app.

## Priority Issues

**[P0] Onboarding & auth are entirely off the design system.** Every first-run surface uses raw `blue-600`/`slate-*`/`red-*` and BaselinePage imports the legacy Button/Card. *Why:* first run is when a frail/anxious patient + caregiver decide to trust a medical companion; landing on generic indigo then a different petrol blue reads as unfinished and wobbles trust on day 0 — the opposite of the retention goal. *Fix:* re-skin login, signup, BiometricsPage, BaselinePage, QuestionCard onto tokens; use primitives' Button/Card + 44px form controls; kill the `bg-[#f8fafc]` hex. *Command:* colorize → polish.

**[P1] Onboarding motion + numerals violate "the patient is tired."** `animate-bounce "AI is thinking"`, spring stiffness:300, shadow-2xl, text-6xl font-black pain numerals. *Why:* the Duolingo register PRODUCT.md rejects; big black numerals on a symptom slider feel alarming. *Fix:* 180ms ease-out-quart, skeleton not bounce, numerals to --text-2xl/600 in ink/accent. *Command:* quieter + animate.

**[P1] framer-motion ignores reduced-motion; faded history becomes unreadable.** globals.css reduced-motion only zeroes CSS durations; onboarding uses framer `animate`/spring props it doesn't stop, and prior questions sit at opacity 0.4 (sub-4.5:1). *Why:* vestibular-sensitive + low-vision older users get full motion and unreadable text. *Fix:* gate variants on useReducedMotion(); raise faded opacity ≥0.7 or recess by size/position only. *Command:* harden.

**[P2] A dev assertion and fabricated biometrics reach the patient.** `alert("Error! handleNext was somehow called with null queryBaseline!")`; hardcoded weightKg:70/heightCm:170 in submitted biometrics. *Why:* raw alert with internal names destroys credibility; fake weight/height in a clinical record is a trust + safety smell. *Fix:* token error card (pattern already exists two cases down); real fields or omit from payload. *Command:* clarify + harden.

**[P2] Onboarding progress unreadable; no Back/edit in Q&A.** LLM phase shows bare pips, hidden >5 cap, no Back, only last 2 kept. *Why:* not knowing how many remain raises anxiety/abandonment for exactly the tired cohort; a mistaken tap is uncorrectable. *Fix:* show "Question N", add Back, allow editing a prior answer. *Command:* onboard + clarify.

## Persona Red Flags

**Jordan (first-timer) — onboarding:** `Sign Up?` label is ambiguous (verb+object better); meets WHO-ICF/ICF codes/"Confirm Score" with no explanation and no help link; after answering, no Back and no confirmation the answer "took" (card fades to 40%); pips with no numbers — can't tell 2-of-5 from 2-of-30. High abandonment at the day-10-14 cliff the product exists to prevent.

**Sam (screen reader + keyboard + contrast) — onboarding:** sliders have no aria-label/aria-valuetext (announces "slider, 5" with no subject); inputs rely on off-token `focus:ring-blue-500`; placeholder likely sub-4.5:1; framer ignores prefers-reduced-motion; 0.4-opacity history fails contrast; the `alert()` yanks focus to a dev string.

**Sam — dashboard (much better):** global 3px focus ring on every control; StreakRing/ProgressBar have role+aria. Two residual flags: (a) `--ink-subtle` (~3.4:1, large-text-only) used at 13px body in priority context line, macro labels, "Updated…" — sub-AA body text; (b) verify the priority `<Link>` accessible name doesn't fold in the chevron.

## Minor Observations

- `console.log` in production paths (QuestionPage, page.tsx). Strip.
- `key={q.questionText}` collides on duplicate text — use an id.
- Dead commented blocks in QuestionCard.tsx and BaselinePage.tsx.
- Dashboard `<h1>`/section heads hardcode `text-[28px]`/`[15px]` instead of `--text-2xl` etc. — on-value, off-method token drift inside the good surface.
- Auth: email field is `type="text"` on login; no show/hide password; no submit loading state; no reset.

## Questions to Consider

1. If the dashboard is the brand, why does a patient meet it last? Would porting just auth + biometrics buy most of the credibility for a fraction of the work?
2. Does a tired post-op patient need to see "WHO-ICF" at all? Could the rigor live in the data and the copy speak like the "competent nurse" voice?
3. Is the Q&A's "hide all but last 2, no Back" a feature or a leaked constraint? A visible, editable "here's what you've told us" list could kill the reduced-motion and memory-bridge problems at once.
