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
import { prisma } from "@/lib/prisma";

/**
 * Dev-only bridge so the harness can drive the state/trajectory flow over HTTP.
 * The real UI goes through React Server Actions (not curl-able); these ops call
 * the same service functions with the authenticated user. Gated to development.
 *
 * POST body: { op: "fetch" | "log" | "history" | "flags", ... }
 *   fetch:   { date: ISO string, force?: boolean }   — get or generate state for date
 *   log:     { moduleId: string, updates: { id, data }[] } — log progress on a module
 *   history: {}                                       — full ordered state chain
 *   flags:   {}                                       — pain stagnation flags over history
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
                const surgeryDate = bio?.surgeryDate ?? new Date();
                const painSeries = getPainSeries(
                    history,
                    new Date(surgeryDate),
                );
                const flags = evaluateRecoveryFlags({ pain: painSeries });
                return NextResponse.json({
                    flags,
                    painSeries,
                    stateCount: history.length,
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
