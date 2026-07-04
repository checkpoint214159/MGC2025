import { prisma } from "@/lib/prisma";
import { StateSchema } from "@/lib/state/schemas/state";
import {
    createInitialProgress,
    createInitialChecklistState,
} from "@/lib/state/converters";
import { StateGenerationLangGraphState } from "@/lib/state/graph/annotation";
import { getAnchorState } from "@/lib/state/services/anchor";
import {
    extractPlanTasks,
    planDistance,
    clampBlueprintsToEnvelope,
    type DistanceContext,
} from "@/lib/state/services/plan-distance";
import { createLogger } from "@/lib/logger";

const log = createLogger("state-gen");

// D at/above this raises a plan_drift Flag for clinician re-verification (env-tunable).
const DRIFT_FLAG_THRESHOLD = Number(
    process.env.PLAN_DRIFT_FLAG_THRESHOLD ?? 0.35,
);

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

    // 0. Plan-space regularization against the clinician anchor (docs/PLAN_DISTANCE.md).
    //    Measure RAW drift (what the model proposed) for observability + flagging, then
    //    CLAMP out-of-envelope numerics — the deterministic "reject": mutations beyond the
    //    expert-set bounds never reach the patient. Semantic/compositional drift can't be
    //    clamped mechanically, so it escalates to clinician review via a Flag instead.
    const anchor = await getAnchorState(state.userId);
    if (anchor) {
        const distCtx: DistanceContext = {
            recoveryDay: Math.max(
                0,
                Math.floor(
                    (new Date(state.date).getTime() -
                        new Date(anchor.dateCreated).getTime()) /
                        86_400_000,
                ),
            ),
            anchorDay: 0,
            arcDays: anchor.recoveryDays ?? 30,
        };
        const anchorTasks = extractPlanTasks(anchor.modules);
        const planTasks = extractPlanTasks(
            Object.entries(state.generatedModules).map(([type, b]) => ({
                type,
                plan: (b as { plan?: unknown }).plan,
            })),
        );

        const dist = planDistance(anchorTasks, planTasks, distCtx);
        const clamps = clampBlueprintsToEnvelope(
            state.generatedModules as Record<string, { plan?: unknown }>,
            anchorTasks,
            distCtx,
        );

        log.info(
            `[plan-distance] ${JSON.stringify({
                userId: state.userId,
                date: new Date(state.date).toISOString().slice(0, 10),
                dayFromAnchor: distCtx.recoveryDay,
                arcDays: distCtx.arcDays,
                D: dist.D,
                composition: dist.composition,
                semantic: dist.semantic,
                numeric: dist.numeric,
                matched: dist.matchedTasks,
                dropped: dist.droppedTasks,
                added: dist.addedTasks,
                clamps,
            })}`,
        );
        if (clamps.length > 0) {
            log.info(
                `✂ clamped ${clamps.length} out-of-envelope goal(s): ` +
                    clamps.map((c) => `${c.name} ${c.from}→${c.to}`).join(", "),
            );
        }

        // Escalate genuine drift to clinician re-verification (dedup: one open flag at a time).
        if (dist.D >= DRIFT_FLAG_THRESHOLD) {
            const openFlag = await prisma.flag.findFirst({
                where: {
                    patientId: state.userId,
                    type: "plan_drift",
                    status: "open",
                },
                select: { id: true },
            });
            if (!openFlag) {
                await prisma.flag.create({
                    data: {
                        patientId: state.userId,
                        type: "plan_drift",
                        severity: dist.D >= 0.6 ? "high" : "medium",
                        detail: {
                            D: dist.D,
                            composition: dist.composition,
                            semantic: dist.semantic,
                            numeric: dist.numeric,
                            dropped: dist.droppedTasks,
                            added: dist.addedTasks,
                            clamps: clamps as unknown as object,
                        } as object,
                        note: `Generated plan drifted D=${dist.D} from the clinician anchor (threshold ${DRIFT_FLAG_THRESHOLD}).`,
                    },
                });
                log.warn(
                    `⚑ plan_drift flag raised | D=${dist.D} (C=${dist.composition} S=${dist.semantic} N=${dist.numeric})`,
                );
            }
        }
    }

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

    // 2. Create the new state row (scalars only). Daily states TRACK the clinician anchor
    //    (plan-of-record) via anchorStateId — the reference the distance metric measured against.
    const created = await prisma.state.create({
        data: {
            userId: state.userId,
            dateCreated: state.date,
            isActive: true,
            causalStateId: state.previousState?.id ?? null,
            causalXId: state.external!.id, // external guaranteed to exist (checked above)
            anchorStateId: anchor?.id ?? null,
        },
    });

    // 3. Create each module + its progress as separate writes (need the module id for progress).
    for (const [type, blueprint] of Object.entries(state.generatedModules) as [
        string,
        {
            summary?: string | null;
            plan: Parameters<typeof createInitialProgress>[0];
            checklists?: Parameters<typeof createInitialChecklistState>[0];
        },
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
