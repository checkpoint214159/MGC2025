# Wally integration — working plan (tasks a/b/c, 2026-06-30)

Living doc for the three-part task; update status as slices land.

## Spec context (from the working document)

Clinicians (physio + dietitian) set the **initial day-0 plan** — goals, limits, parameters —
the human-expert prior Wally generates against. A **deterministic rules layer** runs the daily
loop (adjust targets, flag breached thresholds). The **agentic system** handles open-ended work
(onboarding, semantic mutations from patient requests). Mutations must stay within reasonable
bounds; plans that drift from the clinician's direction/intention are **rejected**.
docs/PLAN_DISTANCE.md is the metric design implementing that rejection/regularization.

## a1 — Preview UI → whole codebase ⏳

Upstream merged the Wally design suite (DESIGN.md tokens in globals.css, components/wally/_,
app/preview/wally/_ mockups) and already migrated: auth pages, patient info pages,
components/recovery/\* (RealPatientDashboard etc.), Sidebar, primitives.tsx, slider.

**Remaining old-palette files (grep: gray-_/blue-600/bg-white/slate-_):**

-   [ ] components/ui/Button.tsx — retokenize cva variants (accent/ink/critical, 44px targets)
-   [ ] components/ui/Card.tsx — surface/border/radius-lg
-   [ ] components/ui/DashboardUtils.tsx
-   [ ] components/ui/{Exercise,Nutrition,Sleep,Symptoms}PreviewCard.tsx (ModuleCard restyle)
-   [ ] app/(app)/chat/page.tsx
-   [ ] app/(app)/patient/dashboard/DashboardRenderer.tsx (admin progress-tab renderer)
-   [ ] app/(app)/patient/info/QuestionPage.tsx (partially migrated upstream; finish)
-   [ ] components/admin/AdminDashboard.tsx
-   [ ] components/admin/PatientDetailView.tsx
-   [ ] components/admin/ReportTab.tsx
-   [ ] components/admin/GraphConfigPanel.tsx
-   [ ] components/development/DevAdminPanel.tsx
-   [ ] components/layout/SidebarSection.tsx

Rules: DESIGN.md vocabulary only — tokens (bg/surface/ink/accent/progress/attention/critical,
border, radius-md/lg), no side-stripe accents, no spinners-mid-content (skeletons), lucide icons
1.75 stroke, 44px tap targets, weight-based hierarchy.

## a2 — Clinician initial-plan upload (the anchor) ☐

-   Server action `setInitialPlanAction(patientId, blueprint)` (admin-gated): creates an
    **anchor State** (isAnchor: true, status "verified") + modules + progress via Neon-safe
    single-row writes (mirror save_state node's write pattern), deactivating any prior state
    for the day. This is the day-0 expert prior AND the reference for the distance metric.
-   UI: new "Initial Plan" affordance in PatientDetailView (admin) — structured form (per-module
    tasks: name, category, goal, unit, intensity) seeded from a sensible template; submit → anchor.
-   Dev op for harness: `{op:"anchor", blueprint?}` to set/read the anchor.

## b — Example test profiles ☐

lib/dev/seed-patient.ts already has presets (colostomy-default + ACL/HIP templates in
lib/dev/templates/). Extend to named, easily loadable personas (sex × surgery), e.g.:

-   colostomy-default (M, 58, colostomy) — existing harness default
-   acl-athlete (F, 24, ACL reconstruction)
-   hip-replacement-elderly (F, 71, hip replacement)
    Expose: seed endpoint accepts `{preset}`; trajectory harness accepts `preset=` and passes it
    through; suite can run a policy × preset matrix later.

## c — Plan-distance metric (docs/PLAN_DISTANCE.md P0+P1) ☐

-   `lib/state/services/plan-envelope.ts` — capacity curve (dual of getExpectedRecovery),
    expected(d) per anchor goal, tolerance band, clamp.
-   `lib/state/services/plan-distance.ts` — pure planDistance(anchor, plan, opts) →
    {D, composition, semantic(cheap: category+intensity JS divergence, no embeddings), numeric,
    perTask[]} with hinge τ + p95 aggregation.
-   Wire: at save_state — compute D vs anchor, CLAMP out-of-band numerics (deterministic reject),
    log `[plan-distance] {json}`, raise Flag (`plan_drift`) when D > threshold (existing Flag table).
-   In-prompt anchoring: inject anchor + envelope into plan-gen context (generation-context.ts).
-   Unit tests (envelope, distance axes, clamp). Dev op for harness observability.

## Verify gate per slice

npm run check && npm run harness; UI slices: eyeball via dev server; c: trajectory run.
