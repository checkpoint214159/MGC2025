import { prisma } from "@/lib/prisma";
import { StateSchema } from "@/lib/state/schemas/state";
import {
    createInitialProgress,
    createInitialChecklistState,
} from "@/lib/state/converters";
import { StateGenerationLangGraphState } from "@/lib/state/graph/annotation";

/**
 * Node: save_state
 *
 * Maps to the prisma.$transaction block at the end of generateNewState() in lib/state/service.ts:
 * - Deactivate any existing active states for today
 * - Create a new State record with all modules + progress
 * - Set causal links (previousState, external)
 *
 * Returns:
 *   { savedState }
 *
 * 💡 LangGraph: This node is called AFTER all generate_module invocations complete (fan-in).
 * The generatedModules field in state will have been merged to contain all modules.
 * By the time this node runs, state.generatedModules[key] is populated for every key.
 */
export async function saveStateNode(
    state: StateGenerationLangGraphState,
): Promise<Partial<StateGenerationLangGraphState>> {
    if (!state.external) {
        throw new Error("External context missing — graph state corrupted");
    }

    // The Neon HTTP adapter (Cloudflare Workers) supports NO transactions — including the
    // multi-row ops Prisma wraps in one (updateMany/deleteMany/createMany), nested relation
    // writes, and $transaction. So we use only single-row writes (by unique id) + reads,
    // sequenced. Atomicity is traded away by the HTTP driver; state generation is
    // idempotent-enough (one active state per day) that a partial failure is recoverable.

    // 1. Deactivate any existing active state(s) for today — find then update each by id
    //    (updateMany is transaction-wrapped → unsupported on HTTP).
    const existingActive = await prisma.state.findMany({
        where: {
            userId: state.userId,
            dateCreated: state.date,
            isActive: true,
        },
        select: { id: true },
    });
    for (const s of existingActive) {
        await prisma.state.update({
            where: { id: s.id },
            data: { isActive: false },
        });
    }

    // 2. Create the new state row (scalars only).
    const created = await prisma.state.create({
        data: {
            userId: state.userId,
            dateCreated: state.date,
            isActive: true,
            causalStateId: state.previousState?.id ?? null,
            causalXId: state.external!.id, // external guaranteed to exist (checked above)
        },
    });

    // 3. Create each module + its progress as separate writes (need the module id for progress).
    for (const [type, blueprint] of Object.entries(state.generatedModules) as [
        string,
        any,
    ][]) {
        const mod = await prisma.module.create({
            data: {
                stateId: created.id,
                type,
                summary: blueprint.summary,
                plan: blueprint.plan,
                checklists: blueprint.checklists || [],
            },
        });
        await prisma.progress.create({
            data: {
                moduleId: mod.id,
                trackables: createInitialProgress(blueprint.plan),
                checklistState: blueprint.checklists
                    ? createInitialChecklistState(blueprint.checklists)
                    : {},
            },
        });
    }

    // 4. Re-read the fully-assembled state.
    const savedState = await prisma.state.findUniqueOrThrow({
        where: { id: created.id },
        include: { modules: { include: { progress: true } } },
    });

    return { savedState: StateSchema.parse(savedState) };
}
