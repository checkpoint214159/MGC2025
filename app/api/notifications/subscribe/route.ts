import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/notifications/subscribe
 * Body: { endpoint, keys: { p256dh, auth } }
 *
 * Saves (or upserts) a browser Web Push subscription for the logged-in user.
 * Called by the client after the user grants notification permission.
 *
 * DELETE /api/notifications/subscribe
 * Body: { endpoint }
 *
 * Removes a subscription (user opts out or browser revokes).
 */
export async function POST(req: Request) {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId)
        return NextResponse.json(
            { error: "not authenticated" },
            { status: 401 },
        );

    const body = await req.json().catch(() => null);
    const { endpoint, keys } = body ?? {};
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return NextResponse.json(
            { error: "invalid subscription object" },
            { status: 400 },
        );
    }

    // Upsert: same endpoint can be re-registered after browser restart without duplicating.
    const existing = await prisma.pushSubscription.findUnique({
        where: { endpoint },
    });
    if (existing) {
        await prisma.pushSubscription.update({
            where: { endpoint },
            data: { p256dh: keys.p256dh, auth: keys.auth },
        });
    } else {
        await prisma.pushSubscription.create({
            data: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
        });
    }

    return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId)
        return NextResponse.json(
            { error: "not authenticated" },
            { status: 401 },
        );

    const { endpoint } = await req.json().catch(() => ({}));
    if (!endpoint)
        return NextResponse.json(
            { error: "endpoint required" },
            { status: 400 },
        );

    await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
    return NextResponse.json({ ok: true });
}
