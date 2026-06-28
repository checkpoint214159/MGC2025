import { prisma } from "@/lib/prisma";
import { getStateHistory } from "@/lib/state/service";
import { getPainSeries } from "@/lib/engagement/arc";
import { getComplianceSeries } from "@/lib/engagement/compliance";
import {
    evaluateRecoveryFlags,
    getLowComplianceSignal,
} from "@/lib/engagement/flags";
import { createLogger } from "@/lib/logger";
import { getPatientMemory } from "@/lib/memory/service";
import { renderMemoryForPrompt } from "@/lib/memory/transforms";
import {
    sendEmail,
    dailyNudgeEmail,
    painAlertEmail,
    lowComplianceEmail,
    complianceAlertEmail,
    type EmailPayload,
} from "./email";
import {
    sendPush,
    dailyNudgePush,
    painAlertPush,
    lowCompliancePush,
    complianceAlertPush,
    type PushPayload,
} from "./push";
import {
    generateNotificationContent,
    notificationLLMEnabled,
    type NotificationKind,
} from "./generate";

const log = createLogger("cron");

/**
 * Contextualize a notification (TODO item 11): generate personalized copy from the patient's
 * memory + situation, falling back to the static template on any failure (or when disabled).
 */
async function contextualizedPayloads(
    kind: NotificationKind,
    name: string,
    situation: string,
    memoryBlock: string,
    templateEmail: EmailPayload,
    templatePush: PushPayload,
): Promise<{ email: EmailPayload; push: PushPayload; generated: boolean }> {
    if (!notificationLLMEnabled() || !memoryBlock) {
        return { email: templateEmail, push: templatePush, generated: false };
    }
    try {
        const c = await generateNotificationContent({
            kind,
            name,
            memoryBlock,
            situation,
        });
        const appUrl =
            process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
        return {
            email: {
                to: "",
                subject: c.subject,
                html: `<p>${c.body}</p>\n<p><a href="${appUrl}/patient/dashboard">Open your dashboard →</a></p>`,
            },
            push: {
                title: c.pushTitle,
                body: c.pushBody,
                url: "/patient/dashboard",
            },
            generated: true,
        };
    } catch (e: unknown) {
        log.warn(
            `contextualized ${kind} failed, using template: ${
                (e as Error).message
            }`,
        );
        return { email: templateEmail, push: templatePush, generated: false };
    }
}

// How many consecutive days without any state before "low compliance" fires.
const LOW_COMPLIANCE_THRESHOLD_DAYS = 2;

interface NotificationResult {
    userId: string;
    email: string;
    name: string;
    sent: string[];
    skipped: string[];
    errors: string[];
    generated: string[]; // kinds whose copy was LLM-contextualized (vs template fallback)
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
 * Returns a summary of what was sent. `complianceThreshold` overrides the low-compliance
 * cutoff so a test harness can keep the cron in lockstep with its flag evaluation.
 */
async function processPatient(
    userId: string,
    complianceThreshold?: number,
): Promise<NotificationResult> {
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
        generated: [],
    };

    if (!email) {
        result.errors.push("no email on record");
        return result;
    }

    const history = await getStateHistory(userId);
    const today = new Date().toISOString().slice(0, 10);

    // Patient memory → the conditioning for contextualized notification copy (item 11).
    const memory = await getPatientMemory(userId);
    const memoryBlock = renderMemoryForPrompt(memory);

    // ── 1. Daily nudge: no state logged for today ──
    const loggedToday = history.some(
        (s) => new Date(s.dateCreated).toISOString().slice(0, 10) === today,
    );
    if (!loggedToday) {
        const p = await contextualizedPayloads(
            "daily-nudge",
            name,
            "They have not logged any recovery progress yet today.",
            memoryBlock,
            dailyNudgeEmail(name),
            dailyNudgePush(),
        );
        if (p.generated) result.generated.push("daily-nudge");
        const r = await notify(
            userId,
            email,
            name,
            p.email,
            p.push,
            "daily-nudge",
        );
        result.sent.push(...r.sent);
        result.errors.push(...r.errors);
    } else {
        result.skipped.push("daily-nudge (already logged)");
    }

    // ── 2. Inactivity: no state logged for N consecutive days (distinct from low % below) ──
    const sortedDates = history
        .map((s) => new Date(s.dateCreated).toISOString().slice(0, 10))
        .sort();
    const latestDate = sortedDates[sortedDates.length - 1];
    if (latestDate) {
        const daysSinceLast = Math.floor(
            (Date.now() - new Date(latestDate).getTime()) / 86400000,
        );
        if (daysSinceLast >= LOW_COMPLIANCE_THRESHOLD_DAYS) {
            const p = await contextualizedPayloads(
                "inactivity",
                name,
                `They have not logged any recovery progress for ${daysSinceLast} day(s).`,
                memoryBlock,
                lowComplianceEmail(name, daysSinceLast),
                lowCompliancePush(daysSinceLast),
            );
            if (p.generated) result.generated.push("inactivity");
            const r = await notify(
                userId,
                email,
                name,
                p.email,
                p.push,
                "inactivity",
            );
            result.sent.push(...r.sent);
            result.errors.push(...r.errors);
        } else {
            result.skipped.push("inactivity (within threshold)");
        }
    }

    // ── 3. Pain stagnation + low compliance flags (computed from the recovery series) ──
    if (bio?.surgeryDate && history.length > 0) {
        const surgeryDate = new Date(bio.surgeryDate);
        const painSeries = getPainSeries(history, surgeryDate);
        const complianceSeries = getComplianceSeries(history, surgeryDate);
        const flags = evaluateRecoveryFlags({
            pain: painSeries,
            compliance: complianceSeries,
            complianceThreshold,
        });

        const painFlag = flags.find((f) => f.kind === "pain_stagnation");
        if (painFlag) {
            const p = await contextualizedPayloads(
                "pain-stagnation",
                name,
                painFlag.detail,
                memoryBlock,
                painAlertEmail(name, painFlag.detail),
                painAlertPush(),
            );
            if (p.generated) result.generated.push("pain-stagnation");
            const r = await notify(
                userId,
                email,
                name,
                p.email,
                p.push,
                "pain-stagnation",
            );
            result.sent.push(...r.sent);
            result.errors.push(...r.errors);
        } else {
            result.skipped.push("pain-stagnation (not flagged)");
        }

        const complianceFlag = flags.find((f) => f.kind === "low_compliance");
        if (complianceFlag) {
            const signal = getLowComplianceSignal(
                complianceSeries,
                complianceThreshold,
            );
            const mean = signal.mean ?? 0;
            const p = await contextualizedPayloads(
                "low-compliance",
                name,
                `Average daily plan completion has been about ${mean}% over the last few days (below the ${signal.threshold}% target).`,
                memoryBlock,
                complianceAlertEmail(name, mean, signal.threshold),
                complianceAlertPush(mean),
            );
            if (p.generated) result.generated.push("low-compliance");
            const r = await notify(
                userId,
                email,
                name,
                p.email,
                p.push,
                "low-compliance",
            );
            result.sent.push(...r.sent);
            result.errors.push(...r.errors);
        } else {
            result.skipped.push("low-compliance (not flagged)");
        }
    }

    return result;
}

/**
 * Main cron entry point. Iterates all active patients and fires notifications.
 * Returns a summary log for the cron response body.
 */
export async function runNotificationCron(opts?: {
    complianceThreshold?: number;
    userId?: string; // scope to a single patient (used by the test harness)
}): Promise<{
    processed: number;
    results: NotificationResult[];
}> {
    const patients = await prisma.user.findMany({
        where: opts?.userId
            ? { role: "patient", id: opts.userId }
            : { role: "patient" },
        select: { id: true },
    });

    const results: NotificationResult[] = [];
    for (const { id } of patients) {
        try {
            const r = await processPatient(id, opts?.complianceThreshold);
            results.push(r);
            if (r.sent.length > 0)
                log.info(
                    `✓ ${id}: sent [${r.sent.join(", ")}]` +
                        (r.generated.length
                            ? ` · contextualized [${r.generated.join(", ")}]`
                            : ""),
                );
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
                generated: [],
            });
        }
    }

    log.info(`processed ${patients.length} patient(s)`);
    return { processed: patients.length, results };
}
