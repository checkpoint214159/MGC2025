import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { setBiometric } from "@/lib/user/service";
import {
    startOnboarding,
    getOnboardingState,
    resumeOnboarding,
} from "@/lib/onboarding/service";

/**
 * Dev-only bridge so the harness can drive the onboarding graph over HTTP. The real UI
 * goes through React Server Actions (not curl-able); these ops call the same service
 * functions with the authenticated user. Gated to development.
 *
 * POST body: { op: "biometrics" | "start" | "state" | "resume", ... }
 *   biometrics: { bio: { age, sex, treatment, surgeryDate } }
 *   resume:     { input }   // screening: Record<id, boolean>; question: string
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
            case "biometrics":
                await setBiometric(userId, body.bio);
                return NextResponse.json({ ok: true });
            case "start":
                return NextResponse.json(await startOnboarding(userId));
            case "state":
                return NextResponse.json(await getOnboardingState(userId));
            case "resume":
                return NextResponse.json(
                    await resumeOnboarding(userId, body.input),
                );
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
