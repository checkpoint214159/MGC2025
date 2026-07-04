import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
    getActiveState,
    generateNewState,
    updateModuleProgress,
    getStateHistory,
} from "@/lib/state/service";
import { getPainSeries } from "@/lib/engagement/arc";
import { evaluateRecoveryFlags } from "@/lib/engagement/flags";
import { getComplianceSeries } from "@/lib/engagement/compliance";
import { getDailyMetrics } from "@/lib/metrics/service";
import { assembleGenerationContext } from "@/lib/state/services/generation-context";
import {
    setInitialPlan,
    getAnchorState,
    DEFAULT_INITIAL_PLAN,
    type InitialPlanInput,
} from "@/lib/state/services/anchor";
import {
    planDistance,
    extractPlanTasks,
} from "@/lib/state/services/plan-distance";
import { prisma } from "@/lib/prisma";

/**
 * Dev-only bridge so the harness can drive the state/trajectory flow over HTTP.
 * The real UI goes through React Server Actions (not curl-able); these ops call
 * the same service functions with the authenticated user. Gated to development.
 *
 * POST body: { op: "fetch" | "log" | "history" | "flags" | "metrics" | "profile", ... }
 *   fetch:   { date: ISO string, force?: boolean }   — get or generate state for date
 *   log:     { moduleId: string, updates: { id, data }[] } — log progress on a module
 *   history: {}                                       — full ordered state chain
 *   flags:   { complianceThreshold?: number }         — pain + compliance flags over history
 *   metrics: {}                                       — persisted DailyMetric rows (asc by date)
 *   context: { date? }                                — assembled context observability (no gen)
 *   profile: {}                                       — name + onboarding profile/semantic memory
 *   anchor:  { set?: "default" | InitialPlanInput }   — set/read the clinician anchor plan
 *   distance:{ date? }                                — plan-distance of active state vs anchor
 *   reset:   {}                                       — delete this patient's states + metrics
 */
export async function POST(req: Request) {
    if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "dev only" }, { status: 403 });
    }
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
        return NextResponse.json(
            { error: "not authenticated" },
            { status: 401 },
        );
    }
    try {
        const body = await req.json().catch(() => ({}));
        switch (body.op) {
            case "fetch": {
                const date = new Date(body.date);
                let state = await getActiveState(userId, date);
                if (!state || body.force) {
                    state = await generateNewState(userId, date);
                }
                return NextResponse.json(state);
            }
            case "log": {
                const result = await updateModuleProgress(
                    body.moduleId,
                    body.updates,
                );
                return NextResponse.json(result);
            }
            case "history": {
                const history = await getStateHistory(userId);
                return NextResponse.json(history);
            }
            case "flags": {
                const history = await getStateHistory(userId);
                const bio = await prisma.biometrics.findUnique({
                    where: { userId },
                    select: { surgeryDate: true },
                });
                const surgeryDate = new Date(bio?.surgeryDate ?? new Date());
                const painSeries = getPainSeries(history, surgeryDate);
                const complianceSeries = getComplianceSeries(
                    history,
                    surgeryDate,
                );
                const flags = evaluateRecoveryFlags({
                    pain: painSeries,
                    compliance: complianceSeries,
                    complianceThreshold:
                        typeof body.complianceThreshold === "number"
                            ? body.complianceThreshold
                            : undefined,
                });
                return NextResponse.json({
                    flags,
                    painSeries,
                    complianceSeries,
                    stateCount: history.length,
                });
            }
            case "metrics": {
                const metrics = await getDailyMetrics(userId);
                return NextResponse.json(metrics);
            }
            case "context": {
                // Inspect the assembled plan-gen context + observability for a date WITHOUT
                // generating (no LLM). Returns layer sizes, memory content/provenance, and the
                // compaction ratio (TODO item 10).
                const date = body.date ? new Date(body.date) : new Date();
                const ctx = await assembleGenerationContext(userId, date);
                return NextResponse.json(ctx.observability);
            }
            case "reset": {
                // Clean slate for a deterministic trajectory run: drop this patient's
                // persisted metrics and state chain so force-regen can't collide on the
                // self-referential causalStateId unique key. Order matters (metrics first;
                // modules/progress cascade on state delete). Neon HTTP: each deleteMany is
                // one statement, so self-referential states delete together fine.
                await prisma.dailyMetric.deleteMany({ where: { userId } });
                const deleted = await prisma.state.deleteMany({
                    where: { userId },
                });
                return NextResponse.json({
                    ok: true,
                    deletedStates: deleted.count,
                });
            }
            case "distance": {
                // Plan-space distance of a day's ACTIVE state vs the clinician anchor
                // (docs/PLAN_DISTANCE.md). No LLM. Returns null when no anchor is set.
                const anchor = await getAnchorState(userId);
                if (!anchor) return NextResponse.json(null);
                const date = body.date ? new Date(body.date) : new Date();
                const target = await getActiveState(userId, date);
                if (!target)
                    return NextResponse.json({
                        error: `no active state for ${date
                            .toISOString()
                            .slice(0, 10)}`,
                    });
                const dist = planDistance(
                    extractPlanTasks(anchor.modules),
                    extractPlanTasks(target.modules),
                    {
                        recoveryDay: Math.max(
                            0,
                            Math.floor(
                                (date.getTime() -
                                    new Date(anchor.dateCreated).getTime()) /
                                    86_400_000,
                            ),
                        ),
                        anchorDay: 0,
                        arcDays: anchor.recoveryDays ?? 30,
                    },
                );
                return NextResponse.json(dist);
            }
            case "anchor": {
                // Set (or read) the clinician initial plan. `set: "default"` uses the
                // built-in template; `set: {...}` a full InitialPlanInput; omitted = read.
                if (body.set) {
                    const input: InitialPlanInput =
                        body.set === "default"
                            ? DEFAULT_INITIAL_PLAN
                            : (body.set as InitialPlanInput);
                    const state = await setInitialPlan(userId, input);
                    return NextResponse.json(state);
                }
                const anchor = await getAnchorState(userId);
                return NextResponse.json(anchor);
            }
            case "profile": {
                const user = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { name: true, profile: true },
                });
                const memory = await prisma.patientMemory.findUnique({
                    where: { userId },
                    select: { semantic: true },
                });
                const bio = await prisma.biometrics.findUnique({
                    where: { userId },
                    select: { surgeryDate: true, treatment: true },
                });
                return NextResponse.json({
                    name: user?.name ?? null,
                    profile: user?.profile ?? "",
                    semantic: memory?.semantic ?? "",
                    surgeryDate: bio?.surgeryDate ?? null,
                    treatment: bio?.treatment ?? null,
                });
            }
            default:
                return NextResponse.json(
                    { error: `unknown op: ${body.op}` },
                    { status: 400 },
                );
        }
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
