/**
 * Houses functionality to get, set and update progress of State.
 * Also to convert state
 */
import { StateSchema, State } from "./schemas/state";
import { prisma } from "@/lib/prisma";
import { isDeepStrictEqual } from "util";
import { getNormalizedAppDate } from "@/lib/date-utils";
import { stateGenerationGraph } from "./graph/graph";

const schema = StateSchema;

export async function getActiveState(
    userId: string,
    date: Date,
): Promise<State | null> {
    const state = await prisma.state.findFirst({
        where: {
            userId: userId,
            dateCreated: date,
            isActive: true,
        },
        include: {
            modules: { include: { progress: true } },
            causalX: true,
        },
    });

    if (state) {
        return StateSchema.parse(state);
    } else {
        return null; // really what am i even doing
    }
}

/**
 * getStateHistory: read-only fetch of a patient's full active-State chain, oldest → newest.
 * Unlike getActiveState/fetchStateAction this NEVER generates — it only reads what exists,
 * so it's safe to call for derived views (streak, recovery arc, progress chart).
 */
export async function getStateHistory(userId: string): Promise<State[]> {
    const states = await prisma.state.findMany({
        where: { userId, isActive: true },
        include: {
            modules: { include: { progress: true } },
            causalX: true,
        },
        orderBy: { dateCreated: "asc" },
    });

    return states.map((s) => StateSchema.parse(s));
}

/**
 * generateNewState — produce and persist a patient's recovery State for a given day.
 *
 * A "State" is the snapshot of a patient's plan + tracking for one day: a set of MODULES
 * (exercise, nutrition, sleep, symptoms), each with an LLM-generated plan (the "blueprint")
 * and an initialized progress record the patient fills in through the day.
 *
 * Everything runs as a one-shot LangGraph (lib/state/graph/graph.ts), no checkpointer:
 *
 *   load_context      Read the patient + their threads, build the EVIDENCE LOG transcript
 *                     (yesterday's state by default; window is configurable), and find the
 *                     previous state to carry forward.
 *         │
 *   compile_external  Freeze that context (profile + threads) into an immutable External
 *                     record, so a generation is reproducible/auditable.
 *         │
 *   dispatch          Fan out — one parallel branch per module key (getModuleKeysForState):
 *         ├── generate_module "exercise"   ┐
 *         ├── generate_module "nutrition"  │  each branch = ONE cached LLM call
 *         ├── generate_module "sleep"      │  (generateModule) → that module's blueprint JSON
 *         └── generate_module "symptoms"   ┘
 *         │
 *   save_state        Fan in — deactivate any prior active state for the day, then write the
 *                     new State + its modules + progress as single-statement writes (the Neon
 *                     HTTP adapter has no transactions). Returns the assembled State.
 *
 * Per-node progress is logged as `[graph] ▶/✓/✗ <node>`; the LLM calls log `[llm] …`; the
 * context size logs `[state-gen] context loaded …`.
 *
 * @throws if the graph finishes without a savedState (a node threw — the `[graph] ✗ <node>`
 *         line names which one and why).
 */
export async function generateNewState(
    userId: string,
    date: Date,
): Promise<State> {
    const startedAt = Date.now();
    console.log(
        `[state-gen] ▶ generateNewState | user=${userId} | date=${date
            .toISOString()
            .slice(0, 10)}`,
    );

    // One-shot invoke — no thread_id/checkpointer (state generation isn't human-in-the-loop).
    const result = await stateGenerationGraph.invoke({ userId, date });

    if (!result.savedState) {
        throw new Error(
            "State generation graph completed without producing a savedState. Graph may have failed silently.",
        );
    }

    console.log(
        `[state-gen] ✓ generateNewState complete | ${
            result.savedState.modules?.length ?? 0
        } module(s) saved in ${Date.now() - startedAt}ms`,
    );
    return result.savedState;
}

type ModuleType = "NUTRITION" | "EXERCISE";

export async function getModule(userId: string, type: ModuleType) {
    const date = await getNormalizedAppDate();

    // We find the module directly using the composite filter
    return await prisma.module.findFirst({
        where: {
            type: type,
            state: {
                userId: userId,
                dateCreated: date,
                isActive: true,
            },
        },
        include: { progress: true },
    });
}

export async function updateModuleProgress(
    moduleId: string,
    updates: { id: string; data: any }[],
) {
    const currentRecord = await prisma.progress.findUnique({
        where: { moduleId },
    });

    if (!currentRecord) {
        throw new Error(`Progress record for module ${moduleId} not found.`);
    }

    // Cast trackables for logic, though Zod will handle the final safety
    const currentTrackables = currentRecord.trackables as any[];

    // 2. Map and Merge
    const updatedTrackables = currentTrackables.map((existing) => {
        const update = updates.find((u) => u.id === existing.id);
        return update ? { ...existing, data: update.data } : existing;
    });

    // 3. Validation Logic
    const updateIds = updates.map((u) => u.id);
    const existingIds = currentTrackables.map((t) => t.id);
    const invalidIds = updateIds.filter((id) => !existingIds.includes(id));

    if (invalidIds.length > 0) {
        throw new Error(`Invalid trackable IDs: ${invalidIds.join(", ")}`);
    }

    // 4. Optimization: Skip DB call if nothing changed
    if (isDeepStrictEqual(currentTrackables, updatedTrackables)) {
        return currentRecord;
    }

    // 5. Save the JSON back to the unified Progress table
    return await prisma.progress.update({
        where: { moduleId },
        data: { trackables: updatedTrackables },
    });
}
