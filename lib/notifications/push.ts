import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const log = createLogger("push");

let configured = false;
function ensureConfigured() {
    if (configured) return;
    const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    const email = process.env.VAPID_EMAIL;
    if (!pub || !priv || !email) {
        throw new Error(
            "VAPID env vars missing (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_EMAIL)",
        );
    }
    webpush.setVapidDetails(email, pub, priv);
    configured = true;
}

export interface PushPayload {
    title: string;
    body: string;
    url?: string;
}

/** Send a push notification to all registered devices for a user. Silently drops expired subs. */
export async function sendPush(
    userId: string,
    payload: PushPayload,
): Promise<void> {
    ensureConfigured();
    const subs = await prisma.pushSubscription.findMany({ where: { userId } });
    const stale: string[] = [];

    await Promise.all(
        subs.map(async (sub) => {
            try {
                await webpush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: { p256dh: sub.p256dh, auth: sub.auth },
                    },
                    JSON.stringify(payload),
                );
            } catch (err: unknown) {
                // 410 Gone = subscription expired/revoked — clean up
                const status = (err as { statusCode?: number }).statusCode;
                if (status === 410) stale.push(sub.id);
                else
                    log.error(
                        `✗ ${sub.endpoint.slice(-20)}:`,
                        (err as Error).message,
                    );
            }
        }),
    );

    for (const id of stale) {
        await prisma.pushSubscription.delete({ where: { id } }).catch(() => {});
    }
}

export function dailyNudgePush(): PushPayload {
    return {
        title: "Time to log your progress 💪",
        body: "Don't forget your daily recovery check-in.",
        url: "/patient/dashboard",
    };
}

export function painAlertPush(): PushPayload {
    return {
        title: "Pain update",
        body: "Your pain levels haven't been improving — consider reaching out to your clinician.",
        url: "/patient/dashboard",
    };
}

export function lowCompliancePush(missedDays: number): PushPayload {
    return {
        title: "We've missed you",
        body: `You haven't logged for ${missedDays} day${
            missedDays === 1 ? "" : "s"
        }. Jump back in to keep your plan on track.`,
        url: "/patient/dashboard",
    };
}
