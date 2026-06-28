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
 *   profile: {}                                       — name + onboarding profile/semantic memory
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
