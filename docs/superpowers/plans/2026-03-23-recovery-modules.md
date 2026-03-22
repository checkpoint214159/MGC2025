# Recovery Modules Enhancement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Sleep and Symptom tracking modules, enhance Exercise/Nutrition preview cards with live progress, and upgrade the dashboard to a 2x2 grid layout.

**Architecture:** Extends the existing module pattern (dedicated Prisma models + Zod schemas + service functions + UI widgets). Sleep reuses the BaseMetric builders. Symptoms use hand-rolled schemas due to their log-based structure. Preview cards compute progress from existing module data.

**Tech Stack:** Next.js 16, TypeScript, Prisma (PostgreSQL), Zod, Tailwind CSS, Framer Motion, Radix UI, Lucide icons

**Spec:** `docs/superpowers/specs/2026-03-23-recovery-modules-design.md`

---

## File Structure

### New files:
| File | Responsibility |
|------|---------------|
| `lib/state/schemas/sleep.ts` | Sleep Zod schemas using base builders |
| `lib/state/schemas/symptoms.ts` | Symptom Zod schemas (hand-rolled) |
| `app/(app)/recovery/sleep/page.tsx` | Sleep detail page (server component) |
| `app/(app)/recovery/sleep/SleepWidget.tsx` | Sleep tracker widget (client component) |
| `app/(app)/recovery/symptoms/page.tsx` | Symptom detail page (server component) |
| `app/(app)/recovery/symptoms/SymptomWidget.tsx` | Symptom tracker widget (client component) |
| `components/ui/SleepPreviewCard.tsx` | Dashboard sleep preview card |
| `components/ui/SymptomsPreviewCard.tsx` | Dashboard symptoms preview card |

### Modified files:
| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add 4 models + State relations |
| `lib/state/schemas/state.ts` | Add optional sleep/symptoms fields |
| `lib/state/service.ts` | Extend state generation, add symptom functions |
| `lib/state/converters.ts` | Add `createInitialSymptomPeriods` |
| `lib/state/ui.ts` | Add sleep/symptom themes |
| `lib/actions.ts` | Extend type union, add symptom actions |
| `components/recovery/DashboardRenderer.tsx` | 2x2 grid, new cards, fix redirect |
| `components/ui/ExercisePreviewCard.tsx` | Live progress data |
| `components/ui/NutritionPreviewCard.tsx` | Live progress data |

---

## Task 1: Prisma Schema — Add Sleep & Symptom Models

**Files:**
- Modify: `prisma/schema.prisma:35-46` (State model) and append new models

- [ ] **Step 1: Add Sleep models to Prisma schema**

Add after line 90 (end of NutritionProgress model) in `prisma/schema.prisma`:

```prisma
// --- SLEEP ---
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

- [ ] **Step 2: Add Symptom models to Prisma schema**

Add after the SleepProgress model:

```prisma
// --- SYMPTOMS ---
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

- [ ] **Step 3: Add relations to State model**

In `prisma/schema.prisma`, inside the `State` model (around line 35-46), add two new optional relations after the existing `nutrition` line:

```prisma
  sleep        SleepModule?
  symptoms     SymptomModule?
```

- [ ] **Step 4: Generate migration and Prisma client**

Run:
```bash
cd /Users/jonathanauyeung/Documents/GitHub/MGC2025 && npx prisma migrate dev --name sleep_symptoms --create-only
```

Then generate the client:
```bash
npx prisma generate
```

Expected: Migration SQL file created in `prisma/migrations/`, Prisma client regenerated without errors.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ generated/
git commit -m "feat: add Sleep and Symptom Prisma models with State relations"
```

---

## Task 2: Sleep Schema

**Files:**
- Create: `lib/state/schemas/sleep.ts`

- [ ] **Step 1: Create the Sleep schema file**

Create `lib/state/schemas/sleep.ts`:

```typescript
import { z } from 'zod';
import {
    BaseMetricObj,
    BaseMetaObj,
    createPlanSchema,
    createProgressSchema,
    createModuleBlueprintSchema,
    createModuleSchema,
} from '@/lib/state/schemas/base';

export const SleepDataSchema = z.object({
    hoursSlept: BaseMetricObj,
    sleepQuality: BaseMetricObj,
    disturbances: BaseMetricObj,
});

export const SleepMetaSchema = BaseMetaObj.extend({
    type: z.literal("sleep"),
});

export const SleepPlanSchema = createPlanSchema({
    dataSchema: SleepDataSchema,
    metaSchema: SleepMetaSchema,
});

export const SleepProgressSchema = createProgressSchema({
    planSchema: SleepPlanSchema,
});

export const SleepModuleBlueprintSchema = createModuleBlueprintSchema({
    planSchema: SleepPlanSchema,
});

export const SleepModuleSchema = createModuleSchema({
    blueprintSchema: SleepModuleBlueprintSchema,
    progressSchema: SleepProgressSchema,
});

export type SleepData = z.infer<typeof SleepDataSchema>;
export type SleepPlan = z.infer<typeof SleepPlanSchema>;
export type SleepProgress = z.infer<typeof SleepProgressSchema>;
export type SleepModuleBlueprint = z.infer<typeof SleepModuleBlueprintSchema>;
export type SleepModule = z.infer<typeof SleepModuleSchema>;
```

- [ ] **Step 2: Verify the schema compiles**

Run:
```bash
cd /Users/jonathanauyeung/Documents/GitHub/MGC2025 && npx tsc --noEmit lib/state/schemas/sleep.ts 2>&1 | head -20
```

If tsc doesn't work standalone, verify by checking the dev server has no errors related to this file.

- [ ] **Step 3: Commit**

```bash
git add lib/state/schemas/sleep.ts
git commit -m "feat: add Sleep module Zod schemas"
```

---

## Task 3: Symptom Schema

**Files:**
- Create: `lib/state/schemas/symptoms.ts`

- [ ] **Step 1: Create the Symptom schema file**

Create `lib/state/schemas/symptoms.ts`. This does NOT use the base builders because symptom data is log-based (checklists + timestamped entries), not `Record<string, BaseMetric>`.

```typescript
import { z } from 'zod';

export const SymptomCheckItemSchema = z.object({
    id: z.string(),
    label: z.string(),
    critical: z.boolean(),
    response: z.boolean().nullable().default(null),
});

export const SymptomLogEntrySchema = z.object({
    id: z.string(),
    site: z.string(),
    description: z.string(),
    intensity: z.number().min(0).max(10),
    timestamp: z.string(),
});

export const SymptomPeriodSchema = z.object({
    checklist: z.array(SymptomCheckItemSchema),
    logs: z.array(SymptomLogEntrySchema).default([]),
    completed: z.boolean().default(false),
});

export const SymptomModuleBlueprintSchema = z.object({
    summary: z.string().nullable().optional(),
    emergencyProtocol: z.string(),
    checklist: z.array(SymptomCheckItemSchema),
});

export const SymptomProgressSchema = z.object({
    id: z.string(),
    moduleId: z.string(),
    morning: SymptomPeriodSchema,
    evening: SymptomPeriodSchema,
});

export const SymptomModuleSchema = z.object({
    id: z.string(),
    stateId: z.string(),
    summary: z.string().nullable().optional(),
    emergencyProtocol: z.string(),
    checklist: z.array(SymptomCheckItemSchema),
    progress: SymptomProgressSchema.nullable().optional(),
});

export type SymptomCheckItem = z.infer<typeof SymptomCheckItemSchema>;
export type SymptomLogEntry = z.infer<typeof SymptomLogEntrySchema>;
export type SymptomPeriod = z.infer<typeof SymptomPeriodSchema>;
export type SymptomModuleBlueprint = z.infer<typeof SymptomModuleBlueprintSchema>;
export type SymptomProgress = z.infer<typeof SymptomProgressSchema>;
export type SymptomModule = z.infer<typeof SymptomModuleSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add lib/state/schemas/symptoms.ts
git commit -m "feat: add Symptom module Zod schemas (hand-rolled, log-based)"
```

---

## Task 4: Update State Schema

**Files:**
- Modify: `lib/state/schemas/state.ts`

- [ ] **Step 1: Add imports and optional fields**

Replace the entire contents of `lib/state/schemas/state.ts` with:

```typescript
import { z } from 'zod';
import { ExerciseModuleSchema, ExerciseModuleBlueprintSchema } from './exercise';
import { NutritionModuleSchema, NutritionModuleBlueprintSchema } from './nutrition';
import { SleepModuleSchema, SleepModuleBlueprintSchema } from './sleep';
import { SymptomModuleSchema, SymptomModuleBlueprintSchema } from './symptoms';


export const StateBlueprintSchema = z.object({
  exercise: ExerciseModuleBlueprintSchema,
  nutrition: NutritionModuleBlueprintSchema,
  sleep: SleepModuleBlueprintSchema.optional(),
  symptoms: SymptomModuleBlueprintSchema.optional(),
});
export type StateBlueprint = z.infer<typeof StateBlueprintSchema>;

export const StateSchema = z.object({
  id: z.string(),
  userId: z.string(),
  dateCreated: z.coerce.date(),
  exercise: ExerciseModuleSchema,
  nutrition: NutritionModuleSchema,
  sleep: SleepModuleSchema.optional(),
  symptoms: SymptomModuleSchema.optional(),
});
export type State = z.infer<typeof StateSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add lib/state/schemas/state.ts
git commit -m "feat: add optional sleep/symptoms to State schemas"
```

---

## Task 5: Converters — Add Symptom Period Initializer

**Files:**
- Modify: `lib/state/converters.ts:1-36`

- [ ] **Step 1: Add import and new function**

Add to the top of `lib/state/converters.ts`, after the existing imports (line 2):

```typescript
import { SleepPlan } from "./schemas/sleep";
import { SymptomCheckItem } from "./schemas/symptoms";
```

Update the `createInitialProgress` function signature to include `SleepPlan` in the union type on line 4:

```typescript
export function createInitialProgress(plan: (ExercisePlan | NutritionPlan | SleepPlan)[]): any {
```

Then add after line 36 (after `createInitialChecklistState` function):

```typescript
export function createInitialSymptomPeriods(checklist: SymptomCheckItem[]) {
  const freshChecklist = checklist.map(item => ({
    ...item,
    response: null,
  }));
  return {
    morning: { checklist: structuredClone(freshChecklist), logs: [], completed: false },
    evening: { checklist: structuredClone(freshChecklist), logs: [], completed: false },
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/state/converters.ts
git commit -m "feat: add createInitialSymptomPeriods converter, extend createInitialProgress for Sleep"
```

---

## Task 6: Theme Additions

**Files:**
- Modify: `lib/state/ui.ts:41` (append after NUTRITION_THEMES)

- [ ] **Step 1: Add sleep and symptom themes**

Add at the end of `lib/state/ui.ts` (after line 41):

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

- [ ] **Step 2: Commit**

```bash
git add lib/state/ui.ts
git commit -m "feat: add Sleep and Symptom theme constants"
```

---

## Task 7: Service — Extend State Generation for Sleep & Symptoms

**Files:**
- Modify: `lib/state/service.ts`

This is the largest modification. Multiple areas of the file need updating.

- [ ] **Step 1: Update EXAMPLE_WIDGET_OUTPUT**

In `lib/state/service.ts`, add `sleep` and `symptoms` keys to `EXAMPLE_WIDGET_OUTPUT`. First, **remove the commented-out symptoms code at lines 97-105** (the old `// "symptoms": { ... }` block). Then add the following inside the object literal, after the `nutrition` block's closing `}` and before the final closing `}` of `EXAMPLE_WIDGET_OUTPUT`:

```typescript
    "sleep": {
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
    },
    "symptoms": {
      "summary": "Monitor surgical site and track post-op symptoms.",
      "emergencyProtocol": "Call your surgeon immediately if fever exceeds 38.5°C or if you notice heavy bleeding.",
      "checklist": [
        { "id": "sym-1", "label": "Is the incision site red or leaking?", "critical": true, "response": null },
        { "id": "sym-2", "label": "Have you had a bowel movement today?", "critical": false, "response": null },
        { "id": "sym-3", "label": "Any nausea or vomiting?", "critical": false, "response": null }
      ]
    }
```

- [ ] **Step 2: Update imports**

Add to the imports at the top of `lib/state/service.ts`:

```typescript
import { createInitialSymptomPeriods } from "@/lib/state/converters";
```

- [ ] **Step 3: Extend getOrGenerateFullState transaction**

In the `prisma.state.create` call (line 139-172), add sleep and symptoms creation inside the `data` block, after the `nutrition` block. Also update the `include` blocks to include the new relations.

Add inside the `data` object (after the `nutrition: { create: { ... } }` block):

```typescript
            ...(generatedPlan.sleep ? {
                sleep: {
                    create: {
                        summary: generatedPlan.sleep.summary,
                        plan: generatedPlan.sleep.plan as any,
                        progress: {
                            create: {
                                trackables: createInitialProgress(generatedPlan.sleep.plan)
                            }
                        }
                    }
                }
            } : {}),
            ...(generatedPlan.symptoms ? {
                symptoms: {
                    create: {
                        summary: generatedPlan.symptoms.summary,
                        emergencyProtocol: generatedPlan.symptoms.emergencyProtocol,
                        checklist: generatedPlan.symptoms.checklist as any,
                        progress: {
                            create: createInitialSymptomPeriods(generatedPlan.symptoms.checklist)
                        }
                    }
                }
            } : {}),
```

Update ALL `include` blocks in this file (there are 3: the `existing` query at line 118, the `prevRecord` query at line 131, and the `create` return at line 168) to include:

```typescript
            sleep: { include: { progress: true } },
            symptoms: { include: { progress: true } },
```

- [ ] **Step 4: Extend ModuleType, ProgressActions, and getModule**

Update `ModuleType` (line 175):
```typescript
type ModuleType = 'exercise' | 'nutrition' | 'sleep';
```

Update the `updateModuleProgress` function signature (line 213) to include `'sleep'`:
```typescript
export async function updateModuleProgress(
  moduleId: string,
  type: 'exercise' | 'nutrition' | 'sleep',
  updates: { id: string; data: any }[]
) {
```

Update `ProgressActions` (line 204-207):
```typescript
const ProgressActions = {
  exercise: prisma.exerciseProgress,
  nutrition: prisma.nutritionProgress,
  sleep: prisma.sleepProgress,
} as const;
```

Add a `'sleep'` case in the `getModule` switch statement (after line 198):
```typescript
    case 'sleep':
      return await prisma.sleepModule.findUnique({
        where: { stateId: stateRecord.id },
        include: { progress: true }
      });
```

- [ ] **Step 5: Add symptom-specific service functions**

Add at the end of the file (after the `LLMGenerateState` function):

```typescript
export async function getSymptomModule(userId: string) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const stateRecord = await prisma.state.findUnique({
    where: { userId_dateCreated: { userId, dateCreated: today } },
    select: { id: true }
  });

  if (!stateRecord) return null;

  return await prisma.symptomModule.findUnique({
    where: { stateId: stateRecord.id },
    include: { progress: true }
  });
}

export async function updateSymptomChecklist(
  moduleId: string,
  period: 'morning' | 'evening',
  itemId: string,
  response: boolean
) {
  const current = await prisma.symptomProgress.findUnique({
    where: { moduleId },
  });
  if (!current) throw new Error(`Symptom progress for module ${moduleId} not found.`);

  const periodData = current[period] as any;
  const updatedChecklist = periodData.checklist.map((item: any) =>
    item.id === itemId ? { ...item, response } : item
  );

  return await prisma.symptomProgress.update({
    where: { moduleId },
    data: {
      [period]: { ...periodData, checklist: updatedChecklist },
    },
  });
}

export async function addSymptomLog(
  moduleId: string,
  period: 'morning' | 'evening',
  logEntry: { id: string; site: string; description: string; intensity: number; timestamp: string }
) {
  const current = await prisma.symptomProgress.findUnique({
    where: { moduleId },
  });
  if (!current) throw new Error(`Symptom progress for module ${moduleId} not found.`);

  const periodData = current[period] as any;
  const updatedLogs = [...periodData.logs, logEntry];

  return await prisma.symptomProgress.update({
    where: { moduleId },
    data: {
      [period]: { ...periodData, logs: updatedLogs },
    },
  });
}

export async function completeSymptomPeriod(
  moduleId: string,
  period: 'morning' | 'evening'
) {
  const current = await prisma.symptomProgress.findUnique({
    where: { moduleId },
  });
  if (!current) throw new Error(`Symptom progress for module ${moduleId} not found.`);

  const periodData = current[period] as any;

  return await prisma.symptomProgress.update({
    where: { moduleId },
    data: {
      [period]: { ...periodData, completed: true },
    },
  });
}
```

- [ ] **Step 6: Update LLM system prompt**

In the `LLMGenerateState` function (around line 262), update the `systemPrompt` to include `SLEEP_TRACKER`:

```typescript
  const systemPrompt = `
    You are a medical recovery expert. Based on the patient's data,
    select recovery widgets from the available list.

    Available Widget Types:
    - EXERCISE_TRACKER: For physical movements or PT.
    - NUTRITION_PLAN: For dietary restrictions.
    - SLEEP_TRACKER: For sleep quality and duration monitoring.
    - SYMPTOM_CHECKER: For tracking pain or red flags.

    For NUTRITION_PLAN widgets, prioritize High-Protein targets (1.5g/kg) and Low-Residue diet items.
    Structure macros as a dictionary and micros as an array of electrolyte goals.

    Return ONLY the JSON structure.
  `;
```

- [ ] **Step 7: Commit**

```bash
git add lib/state/service.ts
git commit -m "feat: extend state service with Sleep/Symptom generation and symptom CRUD functions"
```

---

## Task 8: Server Actions

**Files:**
- Modify: `lib/actions.ts`

- [ ] **Step 1: Extend updateProgressAction and add symptom actions**

Update the import at line 4 to include new functions:

```typescript
import { getOrGenerateFullState, updateModuleProgress, getSymptomModule, updateSymptomChecklist, addSymptomLog, completeSymptomPeriod } from "@/lib/state/service";
```

Update the `updateProgressAction` type parameter on line 27:

```typescript
  type: 'exercise' | 'nutrition' | 'sleep',
```

Add the new symptom actions at the end of the file:

```typescript
export async function updateSymptomChecklistAction(
  moduleId: string,
  period: 'morning' | 'evening',
  itemId: string,
  response: boolean
) {
  try {
    await updateSymptomChecklist(moduleId, period, itemId, response);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function addSymptomLogAction(
  moduleId: string,
  period: 'morning' | 'evening',
  logEntry: { id: string; site: string; description: string; intensity: number; timestamp: string }
) {
  try {
    await addSymptomLog(moduleId, period, logEntry);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function completeSymptomPeriodAction(
  moduleId: string,
  period: 'morning' | 'evening'
) {
  try {
    await completeSymptomPeriod(moduleId, period);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/actions.ts
git commit -m "feat: add sleep to updateProgressAction, add symptom-specific server actions"
```

---

## Task 9: Sleep Widget UI

**Files:**
- Create: `app/(app)/recovery/sleep/page.tsx`
- Create: `app/(app)/recovery/sleep/SleepWidget.tsx`

- [ ] **Step 1: Create SleepWidget component**

Create `app/(app)/recovery/sleep/SleepWidget.tsx`. Follow the same pattern as `ExerciseWidget.tsx` — local state, save button, progress indicators. Single card layout (no grid, one plan item per day).

```typescript
"use client"

import { useState, useMemo } from "react";
import { SleepPlan } from "@/lib/state/schemas/sleep";
import { updateProgressAction } from "@/lib/actions";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { SLEEP_THEME } from "@/lib/state/ui";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Save, Loader2, Moon } from "lucide-react";

interface Props {
  plan: SleepPlan;
  trackable: SleepPlan;
  moduleId: string;
}

export default function SleepWidget({ plan, trackable, moduleId }: Props) {
  const [hoursSlept, setHoursSlept] = useState(trackable.data.hoursSlept.value || 0);
  const [sleepQuality, setSleepQuality] = useState(trackable.data.sleepQuality.value || 0);
  const [disturbances, setDisturbances] = useState(trackable.data.disturbances.value || 0);
  const [status, setStatus] = useState<'idle' | 'saving' | 'success'>('idle');

  const hasChanges = useMemo(() => {
    return (
      hoursSlept !== (trackable.data.hoursSlept.value || 0) ||
      sleepQuality !== (trackable.data.sleepQuality.value || 0) ||
      disturbances !== (trackable.data.disturbances.value || 0)
    );
  }, [hoursSlept, sleepQuality, disturbances, trackable.data]);

  async function handleSave() {
    setStatus('saving');
    const updatedData = {
      hoursSlept: { ...trackable.data.hoursSlept, value: hoursSlept },
      sleepQuality: { ...trackable.data.sleepQuality, value: sleepQuality },
      disturbances: { ...trackable.data.disturbances, value: disturbances },
    };

    try {
      await updateProgressAction(moduleId, 'sleep', [{ id: trackable.id, data: updatedData }]);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      setStatus('idle');
    }
  }

  const hoursGoal = plan.data.hoursSlept.goal;
  const qualityGoal = plan.data.sleepQuality.goal;
  const hoursPercent = Math.min((hoursSlept / hoursGoal) * 100, 100);
  const qualityPercent = Math.min((sleepQuality / qualityGoal) * 100, 100);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className={`p-4 flex items-center justify-between ${SLEEP_THEME.bg} border-b border-slate-100`}>
        <div className="flex items-center gap-2">
          <Moon className={SLEEP_THEME.color} size={20} />
          <h3 className="font-bold text-slate-900">Sleep & Rest</h3>
        </div>
        <motion.button
          disabled={!hasChanges || status === 'saving'}
          onClick={handleSave}
          initial={false}
          animate={{
            backgroundColor: status === 'success' ? "#22c55e" : hasChanges ? "#0f172a" : "#f1f5f9",
            color: status === 'success' || hasChanges ? "#ffffff" : "#94a3b8",
            scale: status === 'saving' ? 0.98 : 1
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-shadow hover:shadow-md disabled:shadow-none"
        >
          <AnimatePresence mode="wait">
            {status === 'saving' ? (
              <motion.div key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Loader2 className="w-3 h-3 animate-spin" />
              </motion.div>
            ) : status === 'success' ? (
              <motion.div key="success" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <Check className="w-3 h-3" />
              </motion.div>
            ) : (
              <motion.div key="save" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Save className="w-3 h-3" />
              </motion.div>
            )}
          </AnimatePresence>
          {status === 'success' ? "Saved" : status === 'saving' ? "Saving..." : "Update"}
        </motion.button>
      </div>

      <div className="p-5 space-y-8">
        {/* Hours Slept */}
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hours Slept</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900">{hoursSlept}</span>
                <span className="text-slate-400 text-xs font-medium">/ {hoursGoal} hrs</span>
              </div>
            </div>
          </div>
          <Progress value={hoursPercent} className="h-2" indicatorColor={SLEEP_THEME.barColor} />
          <Slider
            value={[hoursSlept]}
            max={12}
            step={0.5}
            onValueChange={(vals) => setHoursSlept(vals[0])}
            className="py-2"
          />
        </div>

        {/* Sleep Quality */}
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sleep Quality</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900">{sleepQuality}</span>
                <span className="text-slate-400 text-xs font-medium">/ {qualityGoal}</span>
              </div>
            </div>
          </div>
          <Progress value={qualityPercent} className="h-2" indicatorColor={SLEEP_THEME.barColor} />
          <Slider
            value={[sleepQuality]}
            max={10}
            step={1}
            onValueChange={(vals) => setSleepQuality(vals[0])}
            className="py-2"
          />
        </div>

        {/* Disturbances */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Disturbances</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100">
              <button
                onClick={() => setDisturbances(prev => Math.max(0, prev - 1))}
                className="w-8 h-8 rounded-md bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 active:scale-90 transition-all text-slate-600"
              >-</button>
              <span className="w-10 text-center text-lg font-black text-slate-900">{disturbances}</span>
              <button
                onClick={() => setDisturbances(prev => prev + 1)}
                className="w-8 h-8 rounded-md bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 active:scale-90 transition-all text-slate-600"
              >+</button>
            </div>
            <span className="text-xs text-slate-400">times woken up</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create Sleep page**

Create `app/(app)/recovery/sleep/page.tsx`. Follow the pattern from `app/(app)/recovery/exercise/page.tsx`.

```typescript
import { auth } from "@/auth";
import { getModule } from "@/lib/state/service";
import { redirect } from "next/navigation";
import SleepWidget from "./SleepWidget";

export default async function SleepPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const sleepModule = await getModule(session.user.id, 'sleep');
  if (!sleepModule || !sleepModule.progress) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <p className="text-slate-500 italic">No sleep tracking plan available for today.</p>
      </div>
    );
  }

  const plan = (sleepModule.plan as any[])[0];
  const trackable = (sleepModule.progress.trackables as any[])[0];

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Sleep & Rest</h1>
        {sleepModule.summary && (
          <p className="text-sm text-slate-500 mt-1">{sleepModule.summary}</p>
        )}
      </div>
      <SleepWidget
        plan={plan}
        trackable={trackable}
        moduleId={sleepModule.id}
      />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/recovery/sleep/
git commit -m "feat: add Sleep widget and page"
```

---

## Task 10: Symptom Widget UI

**Files:**
- Create: `app/(app)/recovery/symptoms/page.tsx`
- Create: `app/(app)/recovery/symptoms/SymptomWidget.tsx`

- [ ] **Step 1: Create SymptomWidget component**

Create `app/(app)/recovery/symptoms/SymptomWidget.tsx`:

```typescript
"use client"

import { useState } from "react";
import { SymptomCheckItem, SymptomLogEntry, SymptomPeriod } from "@/lib/state/schemas/symptoms";
import {
  updateSymptomChecklistAction,
  addSymptomLogAction,
  completeSymptomPeriodAction,
} from "@/lib/actions";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { AlertTriangle, HeartPulse, Plus, CheckCircle2, Clock } from "lucide-react";

interface Props {
  moduleId: string;
  emergencyProtocol: string;
  morning: SymptomPeriod;
  evening: SymptomPeriod;
}

const BODY_SITES = [
  "Incision site", "Abdomen", "Chest", "Back", "Head",
  "Legs", "Arms", "General/Whole body", "Other"
];

export default function SymptomWidget({ moduleId, emergencyProtocol, morning: initialMorning, evening: initialEvening }: Props) {
  const [morning, setMorning] = useState<SymptomPeriod>(initialMorning);
  const [evening, setEvening] = useState<SymptomPeriod>(initialEvening);

  const defaultTab = new Date().getHours() < 14 ? 'morning' : 'evening';
  const [activeTab, setActiveTab] = useState<'morning' | 'evening'>(defaultTab);

  const [logSite, setLogSite] = useState(BODY_SITES[0]);
  const [logDescription, setLogDescription] = useState("");
  const [logIntensity, setLogIntensity] = useState(5);
  const [isSaving, setIsSaving] = useState(false);

  const currentPeriod = activeTab === 'morning' ? morning : evening;
  const setCurrentPeriod = activeTab === 'morning' ? setMorning : setEvening;

  async function handleChecklistToggle(itemId: string, response: boolean) {
    // Optimistic update
    setCurrentPeriod(prev => ({
      ...prev,
      checklist: prev.checklist.map(item =>
        item.id === itemId ? { ...item, response } : item
      ),
    }));

    const result = await updateSymptomChecklistAction(moduleId, activeTab, itemId, response);
    if (!result.success) {
      // Revert on failure
      setCurrentPeriod(prev => ({
        ...prev,
        checklist: prev.checklist.map(item =>
          item.id === itemId ? { ...item, response: !response } : item
        ),
      }));
    }
  }

  async function handleAddLog() {
    if (!logDescription.trim()) return;
    setIsSaving(true);

    const entry: SymptomLogEntry = {
      id: `log-${Date.now()}`,
      site: logSite,
      description: logDescription,
      intensity: logIntensity,
      timestamp: new Date().toISOString(),
    };

    const result = await addSymptomLogAction(moduleId, activeTab, entry);
    if (result.success) {
      setCurrentPeriod(prev => ({
        ...prev,
        logs: [...prev.logs, entry],
      }));
      setLogDescription("");
      setLogIntensity(5);
    }
    setIsSaving(false);
  }

  async function handleCompletePeriod() {
    const result = await completeSymptomPeriodAction(moduleId, activeTab);
    if (result.success) {
      setCurrentPeriod(prev => ({ ...prev, completed: true }));
    }
  }

  const getIntensityColor = (intensity: number) => {
    if (intensity <= 3) return "#22c55e";
    if (intensity <= 6) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div className="space-y-6">
      {/* Emergency Protocol Banner */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={18} />
        <div>
          <p className="text-sm font-bold text-red-800">Emergency Protocol</p>
          <p className="text-xs text-red-700 mt-1">{emergencyProtocol}</p>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex gap-2">
        {(['morning', 'evening'] as const).map(tab => {
          const period = tab === 'morning' ? morning : evening;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === tab
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab === 'morning' ? '🌅' : '🌙'} {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {period.completed ? (
                <span className="text-[10px] bg-green-400/30 text-green-100 px-2 py-0.5 rounded-full">Done</span>
              ) : (
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                  activeTab === tab ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                }`}>Due</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Checklist Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-rose-50">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <HeartPulse className="text-rose-600" size={18} />
            Daily Checks
          </h3>
        </div>
        <div className="divide-y divide-slate-50">
          {currentPeriod.checklist.map(item => (
            <div
              key={item.id}
              className={`p-4 flex items-center justify-between gap-3 ${
                item.critical ? 'border-l-4 border-l-red-500' : ''
              }`}
            >
              <div className="flex items-start gap-2 flex-1">
                {item.critical && <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={14} />}
                <p className={`text-sm ${item.critical ? 'font-semibold text-red-900' : 'text-slate-700'}`}>
                  {item.label}
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleChecklistToggle(item.id, true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    item.response === true
                      ? 'bg-red-100 text-red-700 ring-2 ring-red-300'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >Yes</button>
                <button
                  onClick={() => handleChecklistToggle(item.id, false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    item.response === false
                      ? 'bg-green-100 text-green-700 ring-2 ring-green-300'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >No</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Logged Symptoms */}
      {currentPeriod.logs.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">Logged Symptoms ({currentPeriod.logs.length})</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {currentPeriod.logs.map(log => (
              <div key={log.id} className="p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase">{log.site}</span>
                    <p className="text-sm text-slate-700">{log.description}</p>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Intensity:</span>
                  <div className="flex-1">
                    <Progress
                      value={log.intensity * 10}
                      className="h-1.5"
                      indicatorColor={getIntensityColor(log.intensity)}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-600">{log.intensity}/10</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log a Symptom Form */}
      {!currentPeriod.completed && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Plus size={14} /> Log a Symptom
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Body Site</label>
              <select
                value={logSite}
                onChange={(e) => setLogSite(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-300"
              >
                {BODY_SITES.map(site => (
                  <option key={site} value={site}>{site}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</label>
              <textarea
                value={logDescription}
                onChange={(e) => setLogDescription(e.target.value)}
                placeholder="Describe the symptom..."
                rows={2}
                className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Intensity: {logIntensity}/10
              </label>
              <Slider
                value={[logIntensity]}
                max={10}
                step={1}
                onValueChange={(vals) => setLogIntensity(vals[0])}
                className="py-2"
              />
            </div>
            <button
              onClick={handleAddLog}
              disabled={!logDescription.trim() || isSaving}
              className="w-full py-2.5 rounded-xl font-bold text-sm bg-rose-600 text-white hover:bg-rose-700 disabled:bg-slate-100 disabled:text-slate-400 transition-all"
            >
              {isSaving ? "Saving..." : "Add Log Entry"}
            </button>
          </div>
        </div>
      )}

      {/* Complete Period Button */}
      {!currentPeriod.completed && (
        <button
          onClick={handleCompletePeriod}
          className="w-full py-3 rounded-xl font-bold text-sm bg-green-600 text-white hover:bg-green-700 transition-all flex items-center justify-center gap-2"
        >
          <CheckCircle2 size={16} />
          Complete {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Check-in
        </button>
      )}

      {currentPeriod.completed && (
        <div className="text-center py-4 text-green-600 font-bold text-sm flex items-center justify-center gap-2">
          <CheckCircle2 size={16} />
          {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} check-in completed
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create Symptom page**

Create `app/(app)/recovery/symptoms/page.tsx`:

```typescript
import { auth } from "@/auth";
import { getSymptomModule } from "@/lib/state/service";
import { redirect } from "next/navigation";
import SymptomWidget from "./SymptomWidget";

export default async function SymptomsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const symptomModule = await getSymptomModule(session.user.id);
  if (!symptomModule || !symptomModule.progress) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <p className="text-slate-500 italic">No symptom tracking plan available for today.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Symptom Tracker</h1>
        {symptomModule.summary && (
          <p className="text-sm text-slate-500 mt-1">{symptomModule.summary}</p>
        )}
      </div>
      <SymptomWidget
        moduleId={symptomModule.id}
        emergencyProtocol={symptomModule.emergencyProtocol}
        morning={symptomModule.progress.morning as any}
        evening={symptomModule.progress.evening as any}
      />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/recovery/symptoms/
git commit -m "feat: add Symptom widget and page with checklist, logging, and period completion"
```

---

## Tasks 11-15: Preview Cards & Dashboard (UI Batch)

> **Important:** Tasks 11-15 should be implemented together before committing. The preview cards (Tasks 11-12) remove their `onClick` prop and handle navigation internally, while the DashboardRenderer (Task 15) removes the `onClick` prop passing. Committing them separately would break the app between commits. Implement all five tasks, then commit as a batch at the end of Task 15.

## Task 11: Enhanced ExercisePreviewCard

**Files:**
- Modify: `components/ui/ExercisePreviewCard.tsx`

- [ ] **Step 1: Rewrite with live progress data**

Replace the entire contents of `components/ui/ExercisePreviewCard.tsx`:

```typescript
"use client"

import { ArrowRight, Activity } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useRouter } from "next/navigation";

export default function ExercisePreviewCard({ data }: { data: any }) {
  const router = useRouter();
  const plan = data.plan as any[];
  const trackables = data.progress?.trackables as any[] || [];

  // Calculate completion: an exercise is "completed" when all metrics >= 80% of goal
  let completedCount = 0;
  for (const trackable of trackables) {
    const metrics = Object.values(trackable.data) as any[];
    const allComplete = metrics.every((m: any) => m.goal === 0 || (m.value / m.goal) >= 0.8);
    if (allComplete) completedCount++;
  }
  const totalCount = plan.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Intensity breakdown
  const intensityCounts = { blue: 0, orange: 0, red: 0 };
  for (const item of plan) {
    const intensity = item.meta?.intensity as keyof typeof intensityCounts;
    if (intensity in intensityCounts) intensityCounts[intensity]++;
  }

  return (
    <div
      onClick={() => router.push('/recovery/exercise')}
      className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
            <Activity size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Mobility & Exercise</h3>
            <p className="text-sm text-slate-500 line-clamp-1">{data.summary}</p>
          </div>
        </div>
        <ArrowRight className="text-slate-300 group-hover:text-blue-500 transition-colors" size={20} />
      </div>

      {/* Live Progress */}
      <div className="mt-4 space-y-2">
        <div className="flex justify-between text-xs font-medium">
          <span className="text-slate-500">{completedCount}/{totalCount} exercises completed</span>
          <span className="text-slate-900 font-bold">{Math.round(progressPercent)}%</span>
        </div>
        <Progress
          value={progressPercent}
          className="h-2"
          indicatorColor={progressPercent >= 80 ? "#22c55e" : progressPercent >= 50 ? "#f59e0b" : "#3b82f6"}
        />
      </div>

      {/* Intensity & Stats */}
      <div className="mt-3 flex gap-3 items-center">
        <div className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">
          {totalCount} Movements
        </div>
        <div className="flex gap-1.5">
          {intensityCounts.blue > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />{intensityCounts.blue}
            </span>
          )}
          {intensityCounts.orange > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />{intensityCounts.orange}
            </span>
          )}
          {intensityCounts.red > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />{intensityCounts.red}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Do NOT commit yet** — wait for Task 15 batch commit.

---

## Task 12: Enhanced NutritionPreviewCard

**Files:**
- Modify: `components/ui/NutritionPreviewCard.tsx`

- [ ] **Step 1: Rewrite with live progress data**

Replace the entire contents of `components/ui/NutritionPreviewCard.tsx`:

```typescript
"use client"

import { Utensils, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useRouter } from "next/navigation";

export default function NutritionPreviewCard({ data }: { data: any }) {
  const router = useRouter();
  const trackables = data.progress?.trackables as any[] || [];
  const checklistState = data.progress?.checklistState as Record<string, boolean> || {};
  const checklists = data.checklists as any[] || [];

  // Find macros plan item from progress trackables
  const macrosTrackable = trackables.find((t: any) => t.meta?.type === "macros");
  const macrosData = macrosTrackable?.data || {};

  const calories = macrosData.calories;
  const protein = macrosData.protein;
  const carbs = macrosData.carbs;
  const fats = macrosData.fats;

  const caloriePercent = calories ? Math.min((calories.value / calories.goal) * 100, 100) : 0;

  // Checklist progress
  const checklistTotal = checklists.length;
  const checklistDone = Object.values(checklistState).filter(Boolean).length;

  return (
    <div
      onClick={() => router.push('/recovery/nutrition')}
      className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
          <Utensils size={20} />
        </div>
        <div>
          <h3 className="font-bold text-slate-900">Nutrition Plan</h3>
          <p className="text-sm text-slate-500 line-clamp-1">{data.summary}</p>
        </div>
      </div>

      {/* Live Calorie Bar */}
      {calories && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-slate-500">Calories</span>
            <span className="text-slate-900 font-bold">{calories.value} / {calories.goal} kcal</span>
          </div>
          <Progress
            value={caloriePercent}
            className="h-2"
            indicatorColor={caloriePercent >= 80 ? "#22c55e" : caloriePercent >= 50 ? "#f59e0b" : "#f97316"}
          />
        </div>
      )}

      {/* Macro Pills */}
      <div className="mt-3 flex flex-wrap gap-2">
        {protein && (
          <span className="text-[10px] font-bold text-orange-700 bg-orange-50 px-2 py-1 rounded">
            Protein: {protein.value}/{protein.goal}g
          </span>
        )}
        {carbs && (
          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded">
            Carbs: {carbs.value}/{carbs.goal}g
          </span>
        )}
        {fats && (
          <span className="text-[10px] font-bold text-yellow-700 bg-yellow-50 px-2 py-1 rounded">
            Fats: {fats.value}/{fats.goal}g
          </span>
        )}
      </div>

      {/* Checklist Progress + CTA */}
      <div className="mt-3 flex items-center justify-between">
        {checklistTotal > 0 && (
          <span className="text-[10px] font-medium text-slate-500">
            {checklistDone}/{checklistTotal} items checked
          </span>
        )}
        <div className="flex items-center text-blue-600 text-xs font-bold gap-1 ml-auto">
          <Zap size={12} />
          VIEW MEALS & MACROS
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Do NOT commit yet** — wait for Task 15 batch commit.

---

## Task 13: New SleepPreviewCard

**Files:**
- Create: `components/ui/SleepPreviewCard.tsx`

- [ ] **Step 1: Create the component**

Create `components/ui/SleepPreviewCard.tsx`:

```typescript
"use client"

import { Moon, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { SLEEP_THEME } from "@/lib/state/ui";
import { useRouter } from "next/navigation";

export default function SleepPreviewCard({ data }: { data: any }) {
  const router = useRouter();
  const trackables = data.progress?.trackables as any[] || [];
  const sleepTrackable = trackables[0]; // Single plan item per day
  const sleepData = sleepTrackable?.data || {};

  const hours = sleepData.hoursSlept;
  const quality = sleepData.sleepQuality;
  const hoursPercent = hours ? Math.min((hours.value / hours.goal) * 100, 100) : 0;

  return (
    <div
      onClick={() => router.push('/recovery/sleep')}
      className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`${SLEEP_THEME.bg} p-2 rounded-lg ${SLEEP_THEME.color}`}>
            <Moon size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Sleep & Rest</h3>
            <p className="text-sm text-slate-500 line-clamp-1">{data.summary}</p>
          </div>
        </div>
        <ArrowRight className="text-slate-300 group-hover:text-indigo-500 transition-colors" size={20} />
      </div>

      {/* Hours Progress */}
      {hours && (
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-slate-500">Hours Slept</span>
            <span className="text-slate-900 font-bold">{hours.value} / {hours.goal} hrs</span>
          </div>
          <Progress
            value={hoursPercent}
            className="h-2"
            indicatorColor={SLEEP_THEME.barColor}
          />
        </div>
      )}

      {/* Quality Badge */}
      <div className="mt-3 flex gap-3">
        {quality && (
          <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-1 rounded">
            Quality: {quality.value}/{quality.goal}
          </span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Do NOT commit yet** — wait for Task 15 batch commit.

---

## Task 14: New SymptomsPreviewCard

**Files:**
- Create: `components/ui/SymptomsPreviewCard.tsx`

- [ ] **Step 1: Create the component**

Create `components/ui/SymptomsPreviewCard.tsx`:

```typescript
"use client"

import { HeartPulse, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SymptomsPreviewCard({ data }: { data: any }) {
  const router = useRouter();
  const progress = data.progress;
  const morning = progress?.morning as any;
  const evening = progress?.evening as any;

  const morningDone = morning?.completed ?? false;
  const eveningDone = evening?.completed ?? false;

  // Count critical items with response === true
  const criticalFlagged = [
    ...(morning?.checklist || []),
    ...(evening?.checklist || []),
  ].filter((item: any) => item.critical && item.response === true).length;

  // Total logged symptoms
  const totalLogs = (morning?.logs?.length || 0) + (evening?.logs?.length || 0);

  return (
    <div
      onClick={() => router.push('/recovery/symptoms')}
      className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-rose-100 p-2 rounded-lg text-rose-600">
            <HeartPulse size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Symptom Tracker</h3>
            <p className="text-sm text-slate-500 line-clamp-1">{data.summary}</p>
          </div>
        </div>
        <ArrowRight className="text-slate-300 group-hover:text-rose-500 transition-colors" size={20} />
      </div>

      {/* Status Badges */}
      <div className="mt-4 flex flex-wrap gap-2">
        <span className={`text-[10px] font-bold px-2 py-1 rounded ${
          morningDone
            ? 'bg-green-50 text-green-700'
            : 'bg-amber-50 text-amber-700'
        }`}>
          🌅 Morning: {morningDone ? 'Done' : 'Due'}
        </span>
        <span className={`text-[10px] font-bold px-2 py-1 rounded ${
          eveningDone
            ? 'bg-green-50 text-green-700'
            : 'bg-amber-50 text-amber-700'
        }`}>
          🌙 Evening: {eveningDone ? 'Done' : 'Due'}
        </span>

        {criticalFlagged > 0 && (
          <span className="text-[10px] font-bold bg-red-50 text-red-700 px-2 py-1 rounded">
            🚨 {criticalFlagged} critical flagged
          </span>
        )}

        {totalLogs > 0 && (
          <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
            {totalLogs} symptom{totalLogs !== 1 ? 's' : ''} logged
          </span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Do NOT commit yet** — wait for Task 15 batch commit.

---

## Task 15: Dashboard — 2x2 Grid & New Cards (Batch Commit)

**Files:**
- Modify: `components/recovery/DashboardRenderer.tsx`

- [ ] **Step 1: Rewrite DashboardRenderer**

Replace the entire contents of `components/recovery/DashboardRenderer.tsx`. Key changes: 2x2 grid, add sleep/symptom cards, replace `redirect()` with `useRouter().push()` (making it a client component), and import new preview cards.

```typescript
"use client"

import { State } from "@/lib/state/schemas/state";
import ExercisePreviewCard from "@/components/ui/ExercisePreviewCard";
import NutritionPreviewCard from "@/components/ui/NutritionPreviewCard";
import SleepPreviewCard from "@/components/ui/SleepPreviewCard";
import SymptomsPreviewCard from "@/components/ui/SymptomsPreviewCard";

export default function DashboardRenderer({ config }: { config: State | null }) {
  if (!config) {
    return (
      <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl text-center">
        <p className="text-slate-500 italic">No recovery plan found. Please generate one to begin.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {config.exercise && (
        <ExercisePreviewCard data={config.exercise} />
      )}

      {config.nutrition && (
        <NutritionPreviewCard data={config.nutrition} />
      )}

      {config.sleep && (
        <SleepPreviewCard data={config.sleep} />
      )}

      {config.symptoms && (
        <SymptomsPreviewCard data={config.symptoms} />
      )}
    </div>
  );
}
```

Note: The preview cards now handle their own navigation via `useRouter().push()`, so the `onClick` prop is removed from `DashboardRenderer`. This also fixes the pre-existing bug where `redirect()` (a server function) was being used in client event handlers.

- [ ] **Step 2: Batch commit Tasks 11-15**

```bash
git add components/ui/ExercisePreviewCard.tsx components/ui/NutritionPreviewCard.tsx components/ui/SleepPreviewCard.tsx components/ui/SymptomsPreviewCard.tsx components/recovery/DashboardRenderer.tsx
git commit -m "feat: enhance preview cards with live progress, add Sleep/Symptom cards, upgrade dashboard to 2x2 grid"
```

---

## Task 16: Visual Verification

- [ ] **Step 1: Start dev server and verify**

Run:
```bash
cd /Users/jonathanauyeung/Documents/GitHub/MGC2025 && npm run dev
```

Check:
1. `http://localhost:3000` — Dashboard should show a 2x2 grid with Exercise, Nutrition, Sleep, and Symptoms cards
2. Click each card to verify navigation works to `/recovery/exercise`, `/recovery/nutrition`, `/recovery/sleep`, `/recovery/symptoms`
3. Sleep widget should have sliders for hours/quality and counter for disturbances
4. Symptom widget should have morning/evening tabs, checklist, and log form

Note: This requires the database to be reachable and a migration to have been applied. If the DB is unavailable, verify there are no TypeScript compilation errors by checking the dev server output for errors.

- [ ] **Step 2: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address any issues found during visual verification"
```
