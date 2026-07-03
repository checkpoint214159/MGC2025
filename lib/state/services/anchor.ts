import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import {
    StateSchema,
    LLMBlueprintSchema,
    type State,
} from "@/lib/state/schemas/state";
import {
    createInitialProgress,
    createInitialChecklistState,
} from "@/lib/state/converters";
import { getNormalizedAppDate } from "@/lib/date-utils";
import { createLogger } from "@/lib/logger";

const log = createLogger("anchor");

/**
 * Clinician INITIAL PLAN → the ANCHOR State (TODO a2, working-doc spec).
 *
 * The physiotherapist + dietitian set the day-0 plan: goals, limits, and parameters that give
 * Wally its strong human-expert prior. We persist it as a State with `isAnchor: true` and
 * `status: "verified"` — the stable plan-of-record the schema already models (daily generated
 * states point at it via `anchorStateId`), and the reference the plan-distance metric
 * regularizes against (docs/PLAN_DISTANCE.md). Re-submitting demotes the previous anchor —
 * deliberate clinician changes re-anchor rather than reading as drift.
 */

// ── Clinician-facing simplified input ────────────────────────────────────────

export interface InitialExerciseTask {
    name: string;
    /** Exercise category, e.g. "resistance" | "mobility" | "aerobic" | "stability". */
    category: string;
    goal: number;
    unit: string;
    sets?: number;
    intensity: "blue" | "orange" | "red";
    precaution?: string;
}

export interface InitialPlanInput {
    /** Length of the recovery arc in days (drives the progression envelope). */
    recoveryDays: number;
    exercise: InitialExerciseTask[];
    nutrition: {
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
        /** Daily hydration goal in ml; 0/undefined omits the item. */
        hydrationMl?: number;
    };
    sleep: { hours: number };
    summary?: string;
}

/** A sensible generic day-0 plan — used by the dev harness and as a form seed. */
export const DEFAULT_INITIAL_PLAN: InitialPlanInput = {
    recoveryDays: 30,
    exercise: [
        {
            name: "Deep breathing with support",
            category: "mobility",
            goal: 10,
            unit: "breaths",
            intensity: "blue",
        },
        {
            name: "Ankle pumps",
            category: "mobility",
            goal: 20,
            unit: "repetitions",
            intensity: "blue",
        },
        {
            name: "Short assisted walk",
            category: "aerobic",
            goal: 5,
            unit: "minutes",
            intensity: "blue",
        },
    ],
    nutrition: {
        calories: 1800,
        protein: 90,
        carbs: 200,
        fats: 60,
        hydrationMl: 2000,
    },
    sleep: { hours: 8 },
    summary: "Clinician-set initial recovery plan (day 0 anchor).",
};

// ── Blueprint construction (pure) ────────────────────────────────────────────

type ModuleBlueprint = {
    type: string;
    summary: string | null;
    plan: unknown[];
    checklists: unknown[];
};

/** Build schema-conformant module blueprints from the simplified clinician input. */
export function buildAnchorBlueprints(
    input: InitialPlanInput,
): Record<string, ModuleBlueprint> {
    const exercisePlan = input.exercise.map((t) => ({
        id: randomUUID(),
        meta: {
            type: "exercise",
            name: t.name,
            intensity: t.intensity,
            ...(t.precaution ? { precaution: t.precaution } : {}),
        },
        data: {
            [t.category]: {
                goal: t.goal,
                value: 0,
                unit: t.unit,
                ...(t.sets ? { sets: t.sets } : {}),
            },
        },
    }));

    const macros = input.nutrition;
    const nutritionPlan: unknown[] = [
        {
            id: randomUUID(),
            meta: { type: "macros", name: "Daily Macro Targets" },
            data: {
                calories: { goal: macros.calories, value: 0, unit: "kcal" },
                protein: { goal: macros.protein, value: 0, unit: "g" },
                carbs: { goal: macros.carbs, value: 0, unit: "g" },
                fats: { goal: macros.fats, value: 0, unit: "g" },
            },
        },
    ];
    if (macros.hydrationMl && macros.hydrationMl > 0) {
        nutritionPlan.push({
            id: randomUUID(),
            meta: { type: "hydration", name: "Daily Hydration Goal" },
            data: {
                // HydrationSchema is strict: the only allowed key is `water`
                water: { goal: macros.hydrationMl, value: 0, unit: "ml" },
            },
        });
    }

    const sleepPlan = [
        {
            id: randomUUID(),
            meta: { type: "sleep", name: "Nightly Sleep Target" },
            data: {
                duration: {
                    goal: input.sleep.hours,
                    value: 0,
                    unit: "hours",
                },
            },
        },
    ];

    // Symptom tracking (goal 0 — measurement, not prescription) so pain flows from day 0.
    const symptomsPlan = [
        {
            id: randomUUID(),
            meta: { type: "symptoms", name: "Daily Pain Check" },
            data: {
                pain: {
                    goal: 0,
                    value: 0,
                    unit: "level",
                    location: "Surgical site",
                    type: "pain",
                    frequency: "constant",
                },
            },
        },
    ];

    const summary =
        input.summary ?? "Clinician-set initial recovery plan (day 0 anchor).";

    const blueprints = {
        exercise: {
            type: "exercise",
            summary,
            plan: exercisePlan,
            checklists: [],
        },
        nutrition: {
            type: "nutrition",
            summary: null,
            plan: nutritionPlan,
            checklists: [],
        },
        sleep: {
            type: "sleep",
            summary: null,
            plan: sleepPlan,
            checklists: [],
        },
        symptoms: {
            type: "symptoms",
            summary: null,
            plan: symptomsPlan,
            checklists: [],
        },
    };

    // Validate against the module schemas BEFORE any DB write — a malformed clinician
    // input must fail loudly here, never as a half-written anchor state.
    LLMBlueprintSchema.parse(blueprints);

    return blueprints;
}

// ── Persistence (Neon HTTP: single-row writes only) ─────────────────────────

/**
 * Persist the clinician's initial plan as the patient's anchor State for today.
 * Demotes any previous anchor (re-anchoring), deactivates today's active states,
 * then writes State → modules → progress as sequenced single-row creates.
 */
export async function setInitialPlan(
    userId: string,
    input: InitialPlanInput,
): Promise<State> {
    const date = await getNormalizedAppDate();
    const blueprints = buildAnchorBlueprints(input);

    // 1. Demote previous anchors — a new clinician plan re-anchors the reference.
    const priorAnchors = await prisma.state.findMany({
        where: { userId, isAnchor: true },
        select: { id: true },
    });
    for (const a of priorAnchors) {
        await prisma.state.update({
            where: { id: a.id },
            data: { isAnchor: false },
        });
    }

    // 2. Deactivate any active state for today (the anchor becomes today's plan-of-record).
    const existingActive = await prisma.state.findMany({
        where: { userId, dateCreated: date, isActive: true },
        select: { id: true },
    });
    for (const s of existingActive) {
        await prisma.state.update({
            where: { id: s.id },
            data: { isActive: false },
        });
    }

    // 3. Create the anchor state row.
    const created = await prisma.state.create({
        data: {
            userId,
            dateCreated: date,
            isActive: true,
            isAnchor: true,
            status: "verified", // set by a clinician — the human-expert prior
            recoveryDays: input.recoveryDays,
        },
    });

    // 4. Modules + zeroed progress.
    for (const blueprint of Object.values(blueprints)) {
        const mod = await prisma.module.create({
            data: {
                stateId: created.id,
                type: blueprint.type,
                summary: blueprint.summary,
                plan: blueprint.plan as object,
                checklists: (blueprint.checklists ?? []) as object,
            },
        });
        await prisma.progress.create({
            data: {
                moduleId: mod.id,
                trackables: createInitialProgress(
                    blueprint.plan as Parameters<
                        typeof createInitialProgress
                    >[0],
                ),
                checklistState: createInitialChecklistState([]),
            },
        });
    }

    const saved = await prisma.state.findUniqueOrThrow({
        where: { id: created.id },
        include: { modules: { include: { progress: true } } },
    });

    log.info(
        `set initial plan | user=${userId} | arc=${input.recoveryDays}d | ` +
            `${input.exercise.length} exercise task(s), macros ${input.nutrition.calories}kcal/${input.nutrition.protein}g protein, sleep ${input.sleep.hours}h`,
    );
    return StateSchema.parse(saved);
}

/** The patient's current anchor (latest isAnchor state incl. modules), or null. */
export async function getAnchorState(userId: string): Promise<State | null> {
    const anchor = await prisma.state.findFirst({
        where: { userId, isAnchor: true },
        orderBy: { dateCreated: "desc" },
        include: { modules: { include: { progress: true } } },
    });
    return anchor ? StateSchema.parse(anchor) : null;
}
