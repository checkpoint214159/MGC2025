import { prisma } from "@/lib/prisma";
import { getStateHistory } from "@/lib/state/service";
import { getPainSeries } from "@/lib/engagement/arc";
import { evaluateRecoveryFlags } from "@/lib/engagement/flags";
import { createLogger } from "@/lib/logger";
import {
    sendEmail,
    dailyNudgeEmail,
    painAlertEmail,
    lowComplianceEmail,
} from "./email";
import {
    sendPush,
    dailyNudgePush,
    painAlertPush,
    lowCompliancePush,
} from "./push";

const log = createLogger("cron");

// How many consecutive days without any state before "low compliance" fires.
const LOW_COMPLIANCE_THRESHOLD_DAYS = 2;

interface NotificationResult {
    userId: string;
    email: string;
    name: string;
    sent: string[];
    skipped: string[];
    errors: string[];
}

async function notify(
    userId: string,
    email: string,
    name: string,
    emailPayload: ReturnType<typeof dailyNudgeEmail>,
    pushPayload: ReturnType<typeof dailyNudgePush>,
    label: string,
): Promise<{ sent: string[]; errors: string[] }> {
    const sent: string[] = [];
    const errors: string[] = [];

    try {
        await sendEmail({ ...emailPayload, to: email });
        sent.push(`email:${label}`);
    } catch (e: unknown) {
        errors.push(`email:${label}:${(e as Error).message}`);
    }

    try {
        await sendPush(userId, pushPayload);
        sent.push(`push:${label}`);
    } catch (e: unknown) {
        errors.push(`push:${label}:${(e as Error).message}`);
    }

    return { sent, errors };
}

/**
 * Run all notification checks for a single patient and fire the relevant channels.
 * Returns a summary of what was sent.
 */
async function processPatient(userId: string): Promise<NotificationResult> {
    const account = await prisma.account.findUnique({
        where: { user_id: userId },
        select: { email: true },
    });
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
    });
    const bio = await prisma.biometrics.findUnique({
        where: { userId },
        select: { surgeryDate: true },
    });

    const email = account?.email ?? "";
    const name = user?.name ?? "there";
    const result: NotificationResult = {
        userId,
        email,
        name,
        sent: [],
        skipped: [],
        errors: [],
    };

    if (!email) {
        result.errors.push("no email on record");
        return result;
    }

    const history = await getStateHistory(userId);
    const today = new Date().toISOString().slice(0, 10);

    // ── 1. Daily nudge: no state logged for today ──
    const loggedToday = history.some(
        (s) => new Date(s.dateCreated).toISOString().slice(0, 10) === today,
    );
    if (!loggedToday) {
        const r = await notify(
            userId,
            email,
            name,
            dailyNudgeEmail(name),
            dailyNudgePush(),
            "daily-nudge",
        );
        result.sent.push(...r.sent);
        result.errors.push(...r.errors);
    } else {
        result.skipped.push("daily-nudge (already logged)");
    }

    // ── 2. Low compliance: no state for N consecutive days ──
    const sortedDates = history
        .map((s) => new Date(s.dateCreated).toISOString().slice(0, 10))
        .sort();
    const latestDate = sortedDates[sortedDates.length - 1];
    if (latestDate) {
        const daysSinceLast = Math.floor(
            (Date.now() - new Date(latestDate).getTime()) / 86400000,
        );
        if (daysSinceLast >= LOW_COMPLIANCE_THRESHOLD_DAYS) {
            const r = await notify(
                userId,
                email,
                name,
                lowComplianceEmail(name, daysSinceLast),
                lowCompliancePush(daysSinceLast),
                "low-compliance",
            );
            result.sent.push(...r.sent);
            result.errors.push(...r.errors);
        } else {
            result.skipped.push("low-compliance (within threshold)");
        }
    }

    // ── 3. Pain stagnation flag ──
    if (bio?.surgeryDate && history.length > 0) {
        const painSeries = getPainSeries(history, new Date(bio.surgeryDate));
        const flags = evaluateRecoveryFlags({ pain: painSeries });
        const painFlag = flags.find((f) => f.kind === "pain_stagnation");

        if (painFlag) {
            const r = await notify(
                userId,
                email,
                name,
                painAlertEmail(name, painFlag.detail),
                painAlertPush(),
                "pain-stagnation",
            );
            result.sent.push(...r.sent);
            result.errors.push(...r.errors);
        } else {
            result.skipped.push("pain-stagnation (not flagged)");
        }
    }

    return result;
}

/**
 * Main cron entry point. Iterates all active patients and fires notifications.
 * Returns a summary log for the cron response body.
 */
export async function runNotificationCron(): Promise<{
    processed: number;
    results: NotificationResult[];
}> {
    const patients = await prisma.user.findMany({
        where: { role: "patient" },
        select: { id: true },
    });

    const results: NotificationResult[] = [];
    for (const { id } of patients) {
        try {
            const r = await processPatient(id);
            results.push(r);
            if (r.sent.length > 0)
                log.info(`✓ ${id}: sent [${r.sent.join(", ")}]`);
            if (r.errors.length > 0)
                log.error(`✗ ${id}: errors [${r.errors.join(", ")}]`);
        } catch (e: unknown) {
            log.error(`✗ ${id} unhandled:`, (e as Error).message);
            results.push({
                userId: id,
                email: "",
                name: "",
                sent: [],
                skipped: [],
                errors: [(e as Error).message],
            });
        }
    }

    log.info(`processed ${patients.length} patient(s)`);
    return { processed: patients.length, results };
}
