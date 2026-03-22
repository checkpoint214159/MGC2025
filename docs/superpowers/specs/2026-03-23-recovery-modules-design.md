# Recovery Modules Enhancement — Design Spec

## Overview

Bolster the MGC2025 post-op health tracking app by:
1. Adding **Sleep** and **Symptom** modules (schema, DB, service, UI)
2. Enhancing **Exercise** and **Nutrition** preview cards with live progress data
3. Upgrading the dashboard layout for better visibility across all four modules

## Architecture Approach

Follow the existing module pattern (Approach A) — dedicated Prisma models per module, Zod schemas, service integration. Sleep fits the `BaseMetricObj` goal/value/unit pattern and uses the standard schema builders. Symptoms are fundamentally different (log-based with morning/evening periods) and **cannot** use the base builders (`createPlanSchema`, `createModuleSchema`, etc.) because their data shape is not `Record<string, BaseMetric>` — they use hand-rolled Zod schemas instead, while keeping the same Prisma model structure for DB consistency.

---

## 1. Sleep Module

### Schema (`lib/state/schemas/sleep.ts`)

Uses the existing `BaseMetricObj` pattern with fixed fields (like Nutrition, not catchall like Exercise).

```typescript
SleepDataSchema = z.object({
  hoursSlept: BaseMetricObj,    // { goal: 8, value: 0, unit: "hours" }
  sleepQuality: BaseMetricObj,  // { goal: 8, value: 0, unit: "rating" } — 0-10 scale
  disturbances: BaseMetricObj,  // { goal: 0, value: 0, unit: "count" } — lower is better
})

SleepMetaSchema = BaseMetaObj.extend({
  type: z.literal("sleep"),
})

SleepPlanSchema = createPlanSchema({ dataSchema: SleepDataSchema, metaSchema: SleepMetaSchema })
SleepProgressSchema = createProgressSchema({ planSchema: SleepPlanSchema })
SleepModuleBlueprintSchema = createModuleBlueprintSchema({ planSchema: SleepPlanSchema })
SleepModuleSchema = createModuleSchema({
  blueprintSchema: SleepModuleBlueprintSchema,
  progressSchema: SleepProgressSchema,
})
```

**Types exported:** `SleepData`, `SleepPlan`, `SleepProgress`, `SleepModuleBlueprint`, `SleepModule`

### Prisma Models

```prisma
model SleepModule {
  id       String  @id @default(cuid())
  stateId  String  @unique
  state    State   @relation(fields: [stateId], references: [id])
  summary  String?
  plan     Json
  progress SleepProgress?
}

model SleepProgress {
  id         String      @id @default(cuid())
  moduleId   String      @unique
  module     SleepModule @relation(fields: [moduleId], references: [id])
  summary    String?
  trackables Json
}
```

`State` model gets: `sleep SleepModule?`

### Service Integration

- `EXAMPLE_WIDGET_OUTPUT` gains a `sleep` key:
  ```json
  {
    "summary": "Aim for 7-8 hours of uninterrupted sleep to support tissue repair.",
    "plan": [{
      "id": "sleep-daily",
      "meta": { "type": "sleep", "name": "Daily Sleep Log" },
      "data": {
        "hoursSlept": { "goal": 8, "value": 0, "unit": "hours" },
        "sleepQuality": { "goal": 8, "value": 0, "unit": "rating" },
        "disturbances": { "goal": 0, "value": 0, "unit": "count" }
      }
    }]
  }
  ```
- `getOrGenerateFullState`: creates `SleepModule` + `SleepProgress` in the same transaction. Sleep uses the existing `createInitialProgress` function from `converters.ts` (it zeroes out `BaseMetric` values, which works for Sleep's fixed fields).
- `getModule`: extended with `'sleep'` case
- `updateModuleProgress`: extended with `'sleep'` type — Sleep uses the same generic metric-merge pattern as Exercise/Nutrition
- `ModuleType` becomes `'exercise' | 'nutrition' | 'sleep'`
- `ProgressActions` gains `sleep: prisma.sleepProgress`

### Actions (`lib/actions.ts`)

The existing `updateProgressAction` type union is extended from `'exercise' | 'nutrition'` to `'exercise' | 'nutrition' | 'sleep'`. No new action function needed — Sleep fits the same update pattern.

### UI

**Widget page** (`app/(app)/recovery/sleep/page.tsx`): Server component fetching sleep module, renders `SleepWidget`.

**Widget** (`app/(app)/recovery/sleep/SleepWidget.tsx`):
- Single card (one plan item per day, no grid)
- Slider for hours slept (0-12, step 0.5)
- Slider for sleep quality (0-10, step 1)
- Counter for disturbances (increment/decrement buttons)
- Progress indicators showing value vs goal
- Save button with loading/success states (same pattern as Exercise/Nutrition)
- Theme: indigo (icon, progress bar color)

---

## 2. Symptom Module

### Schema (`lib/state/schemas/symptoms.ts`)

Diverges from BaseMetric — log-based structure. **Does not use the base schema builders** (`createPlanSchema`, `createModuleSchema`, etc.) because symptom data is fundamentally different: checklists with boolean responses and free-form timestamped logs, not `Record<string, BaseMetric>`. All schemas are hand-rolled `z.object()` definitions.

```typescript
SymptomCheckItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  critical: z.boolean(),
  response: z.boolean().nullable().default(null),  // yes/no toggle only
})

SymptomLogEntrySchema = z.object({
  id: z.string(),
  site: z.string(),           // "abdomen", "incision", "chest", etc.
  description: z.string(),
  intensity: z.number(),      // 0-10
  timestamp: z.string(),      // ISO string
})

SymptomPeriodSchema = z.object({
  checklist: z.array(SymptomCheckItemSchema),
  logs: z.array(SymptomLogEntrySchema).default([]),
  completed: z.boolean().default(false),
})

SymptomModuleBlueprintSchema = z.object({
  summary: z.string().nullable().optional(),
  emergencyProtocol: z.string(),
  checklist: z.array(SymptomCheckItemSchema),
})

SymptomProgressSchema = z.object({
  id: z.string(),
  moduleId: z.string(),
  morning: SymptomPeriodSchema,
  evening: SymptomPeriodSchema,
})

SymptomModuleSchema = z.object({
  id: z.string(),
  stateId: z.string(),
  summary: z.string().nullable().optional(),
  emergencyProtocol: z.string(),
  checklist: z.array(SymptomCheckItemSchema),  // template stored as JSON
  progress: SymptomProgressSchema.nullable().optional(),
})
```

**Note on checklist items:** All checklist items use boolean responses (yes/no toggles). Items like "Rate your pain from 1-10" should be modeled as free-form log entries (where the patient uses the intensity slider), not as checklist items. The generated checklist should only contain yes/no questions.

**Types exported:** `SymptomCheckItem`, `SymptomLogEntry`, `SymptomPeriod`, `SymptomModuleBlueprint`, `SymptomProgress`, `SymptomModule`

### Prisma Models

```prisma
model SymptomModule {
  id                String  @id @default(cuid())
  stateId           String  @unique
  state             State   @relation(fields: [stateId], references: [id])
  summary           String?
  emergencyProtocol String
  checklist         Json
  progress          SymptomProgress?
}

model SymptomProgress {
  id       String        @id @default(cuid())
  moduleId String        @unique
  module   SymptomModule @relation(fields: [moduleId], references: [id])
  morning  Json
  evening  Json
}
```

`State` model gets: `symptoms SymptomModule?`

### Service Integration

- `EXAMPLE_WIDGET_OUTPUT` gains a `symptoms` key:
  ```json
  {
    "summary": "Monitor surgical site and track post-op symptoms.",
    "emergencyProtocol": "Call your surgeon immediately if fever exceeds 38.5C or if you notice heavy bleeding.",
    "checklist": [
      { "id": "sym-1", "label": "Is the incision site red or leaking?", "critical": true, "response": null },
      { "id": "sym-2", "label": "Have you had a bowel movement today?", "critical": false, "response": null },
      { "id": "sym-3", "label": "Any nausea or vomiting?", "critical": false, "response": null }
    ]
  }
  ```
- `getOrGenerateFullState`: creates `SymptomModule` + `SymptomProgress` in the same transaction. New `createInitialSymptomPeriods` function in `converters.ts` takes the checklist template and returns `{ morning: { checklist: [...copy], logs: [], completed: false }, evening: { checklist: [...copy], logs: [], completed: false } }`.
- Symptoms use a **separate code path** from the generic `getModule`/`updateModuleProgress`:
  - `getSymptomModule(userId)`: fetches today's symptom module with progress
  - `updateSymptomChecklist(moduleId, period, itemId, response)`: toggles a checklist item
  - `addSymptomLog(moduleId, period, logEntry)`: appends a log entry to the specified period
  - `completeSymptomPeriod(moduleId, period)`: marks morning/evening as completed
- Period determination: resolved client-side. The widget checks `new Date().getHours() < 14` to determine which tab to show as active/default. Both tabs are always accessible.

### Actions (`lib/actions.ts`)

New symptom-specific server actions:
- `updateSymptomChecklistAction(moduleId, period, itemId, response)`
- `addSymptomLogAction(moduleId, period, logEntry)`
- `completeSymptomPeriodAction(moduleId, period)`

These are separate from `updateProgressAction` because the update shape is fundamentally different (appending logs, toggling booleans vs merging metric values).

### UI

**Widget page** (`app/(app)/recovery/symptoms/page.tsx`): Server component fetching symptom module.

**Widget** (`app/(app)/recovery/symptoms/SymptomWidget.tsx`):
- Emergency protocol banner at top (red/amber, always visible)
- Two tabs: Morning / Evening (active tab highlighted, show "Due"/"Done" badge)
- Default active tab: Morning if before 14:00, Evening otherwise (client-side check)
- Per tab:
  - **Checklist section**: list of check items with yes/no toggle buttons. Critical items have red left border + warning icon
  - **Log section**: existing logged entries displayed as cards (site, description, intensity bar)
  - **"Log a symptom" form**: body site dropdown, description text input, intensity slider (0-10), submit button
  - **Submit period** button: marks the period as completed
- Theme: rose (icon, accents, critical highlights in red)

---

## 3. Enhanced Preview Cards

### ExercisePreviewCard (enhanced)

Props receive `data` which is the full `ExerciseModule` (with progress).

New content:
- **Progress bar**: overall exercise completion. An exercise is "completed" when all metrics >= 80% of goal. Bar shows `completedCount / totalCount`.
- **Intensity dots**: small colored dots (blue/orange/red) showing the count per intensity level
- Existing summary text and arrow preserved

### NutritionPreviewCard (enhanced)

Props receive `data` which is the full `NutritionModule` (with progress).

New content:
- **Live calorie bar**: reads calorie value/goal from the macros plan item in progress trackables
- **Macro pills**: small badges for protein, carbs, fats showing `value/goal` (e.g. "65/80g")
- **Checklist progress**: "2/4 items" if checklists exist
- Existing icon and title preserved

### SleepPreviewCard (new)

- Indigo icon (Moon from lucide)
- "Sleep & Rest" title
- Hours slept vs target: "6.5 / 8 hrs" with indigo progress bar
- Sleep quality as text: "Quality: 7/10"
- Click navigates to `/recovery/sleep`

### SymptomsPreviewCard (new)

- Rose icon (HeartPulse from lucide)
- "Symptom Tracker" title
- Morning/Evening status badges: green "Done" or amber "Due"
- Critical flag count badge (red) if any critical checklist items have `response: true`
- Total logged symptom count
- Click navigates to `/recovery/symptoms`

---

## 4. Dashboard Layout

`DashboardRenderer` changes:
- Grid becomes `grid-cols-1 md:grid-cols-2` for a 2x2 layout
- Render order: Exercise (top-left), Nutrition (top-right), Sleep (bottom-left), Symptoms (bottom-right)
- Each card conditionally rendered based on presence in state (same pattern as current)
- All four preview cards receive their full module data from the `State` object
- **Fix**: replace `redirect()` in onClick handlers with `useRouter().push()` — `redirect()` is a server function and should not be used in client event handlers. This requires making `DashboardRenderer` a client component or converting cards to use `<Link>`.

`StateSchema` and `StateBlueprintSchema` updated to include `sleep` and `symptoms` as **optional** fields (`.optional()`), since the LLM may not always generate all four modules and modules may appear/disappear based on surgery type. Note: the existing `exercise` and `nutrition` fields are currently required — this is a pre-existing design choice we preserve for now.

---

## 5. Theme Additions

`lib/state/ui.ts` (exists, being modified) gains:

```typescript
export const SLEEP_THEME = {
  icon: "🌙",
  color: "text-indigo-600",
  bg: "bg-indigo-50",
  barColor: "#6366f1",
} as const;

export const SYMPTOM_THEMES = {
  default: { icon: "💓", color: "text-rose-600", bg: "bg-rose-50" },
  critical: { icon: "🚨", color: "text-red-700", bg: "bg-red-50" },
} as const;
```

---

## 6. Files Changed / Created

### New files:
- `lib/state/schemas/sleep.ts` — Sleep Zod schemas (uses base builders)
- `lib/state/schemas/symptoms.ts` — Symptom Zod schemas (hand-rolled, does not use base builders)
- `app/(app)/recovery/sleep/page.tsx` — Sleep detail page
- `app/(app)/recovery/sleep/SleepWidget.tsx` — Sleep tracker widget
- `app/(app)/recovery/symptoms/page.tsx` — Symptom detail page
- `app/(app)/recovery/symptoms/SymptomWidget.tsx` — Symptom tracker widget
- `components/ui/SleepPreviewCard.tsx` — Dashboard sleep card
- `components/ui/SymptomsPreviewCard.tsx` — Dashboard symptoms card
- `prisma/migrations/<timestamp>_sleep_symptoms/migration.sql` — Auto-generated

### Modified files:
- `prisma/schema.prisma` — Add 4 new models (`SleepModule`, `SleepProgress`, `SymptomModule`, `SymptomProgress`) + State relations
- `lib/state/schemas/state.ts` — Add optional `sleep`/`symptoms` to `StateSchema` + `StateBlueprintSchema`
- `lib/state/service.ts` — Extend `getOrGenerateFullState` for sleep/symptoms creation, add `'sleep'` to `getModule`/`updateModuleProgress`/`ModuleType`/`ProgressActions`, add separate `getSymptomModule`/`updateSymptomChecklist`/`addSymptomLog`/`completeSymptomPeriod` functions, update `EXAMPLE_WIDGET_OUTPUT` with sleep/symptom data, update LLM system prompt to include `SLEEP_TRACKER` type
- `lib/state/converters.ts` — Add `createInitialSymptomPeriods` function (Sleep uses existing `createInitialProgress`)
- `lib/state/ui.ts` — Add `SLEEP_THEME` and `SYMPTOM_THEMES`
- `lib/actions.ts` — Extend `updateProgressAction` type to include `'sleep'`, add new symptom-specific actions (`updateSymptomChecklistAction`, `addSymptomLogAction`, `completeSymptomPeriodAction`)
- `components/recovery/DashboardRenderer.tsx` — Add sleep/symptom cards, 2x2 grid, fix `redirect()` -> `useRouter().push()` or `<Link>`
- `components/ui/ExercisePreviewCard.tsx` — Live progress data from module progress
- `components/ui/NutritionPreviewCard.tsx` — Live progress data from module progress

### Not changed:
- Existing Exercise/Nutrition widget pages and widgets — untouched
- Auth, onboarding, chat — untouched
- `lib/state/schemas/base.ts` — no changes needed
- `app/(app)/page.tsx` — no changes needed (already passes full state to DashboardRenderer)
