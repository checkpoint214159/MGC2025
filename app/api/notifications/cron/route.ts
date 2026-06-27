import { NextResponse } from "next/server";
import { runNotificationCron } from "@/lib/notifications/service";

/**
 * POST /api/notifications/cron
 * Authorization: Bearer <CRON_SECRET>
 *
 * Trigger the notification cron: daily nudge + pain/compliance alerts for all patients.
 * Call this from Cloudflare Cron Triggers, cron-job.org, or any scheduler at 08:00 daily.
 *
 * Example wrangler cron trigger (wrangler.toml):
 *   [[triggers.crons]]
 *   crons = ["0 8 * * *"]
 *   → binds to a Worker that fetches POST /api/notifications/cron with the bearer token.
 */
export async function POST(req: Request) {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
        return NextResponse.json(
            { error: "CRON_SECRET not configured" },
            { status: 500 },
        );
    }

    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    try {
        const summary = await runNotificationCron();
        console.log(
            `[cron] notifications: ${summary.processed} patient(s) processed, ` +
                `${summary.results.reduce(
                    (n, r) => n + r.sent.length,
                    0,
                )} notification(s) sent`,
        );
        return NextResponse.json(summary);
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.error("[cron] notifications failed:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
