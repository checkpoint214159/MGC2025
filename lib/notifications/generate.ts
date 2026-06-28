import { generateObject } from "ai";
import { z } from "zod";
import { getModel, LLM_MAX_RETRIES } from "@/lib/llm/model";
import { anthropicSafeSchema } from "@/lib/llm/utils";
import { createLogger } from "@/lib/logger";

const log = createLogger("notify-gen");

/**
 * Contextualized notification copy (TODO item 11). Instead of one canned string per alert type,
 * generate a brief, personalized message conditioned on the patient's MEMORY (what they're
 * actually going through) plus the specific situation. Falls back to a template on any failure,
 * so notifications never depend on the LLM being up (see contextualizedPayloads in service.ts).
 *
 * Off-switch: set NOTIFICATION_LLM=off to skip generation entirely and use templates (cheaper,
 * deterministic — handy for tests and cost control).
 */

export type NotificationKind =
    | "daily-nudge"
    | "pain-stagnation"
    | "low-compliance"
    | "inactivity";

const NotificationContentSchema = z.object({
    subject: z
        .string()
        .describe("Email subject line, < 80 chars, warm, specific"),
    body: z
        .string()
        .describe(
            "Email body, 2-3 short sentences, plain text (no HTML), addressed to the patient",
        ),
    pushTitle: z.string().describe("Push title, < 40 chars"),
    pushBody: z.string().describe("Push body, one sentence, < 140 chars"),
});

export type NotificationContent = z.infer<typeof NotificationContentSchema>;

export function notificationLLMEnabled(): boolean {
    return (process.env.NOTIFICATION_LLM ?? "on").toLowerCase() !== "off";
}

const KIND_GUIDANCE: Record<NotificationKind, string> = {
    "daily-nudge":
        "A gentle daily check-in reminder — they simply haven't logged today. Encouraging, light, never nagging.",
    "pain-stagnation":
        "Their pain hasn't improved over several days. Be caring and take it seriously, but DO NOT alarm or diagnose — encourage them to check in with their care team.",
    "low-compliance":
        "They've been completing only part of their plan lately. Be supportive and curious about barriers, not judgmental. Small steps count.",
    inactivity:
        "They haven't logged for a few days. Warmly invite them back; acknowledge that recovery has ups and downs.",
};

const SYSTEM = `You write brief, warm, genuinely personalized notifications for a post-surgical recovery app.
You are given the patient's MEMORY (stable clinical facts + their recovery narrative) and the SITUATION
that triggered this message. Use the memory to make the message specific to THIS person — reference their
actual recovery context naturally — instead of a generic reminder.

Rules: be supportive and human; never alarming, never clinical jargon, never diagnose. Keep it short.
Do not invent medical facts not present in the memory. Do not include links (the app adds them).`;

/** Generate personalized notification copy. Throws on failure (caller falls back to a template). */
export async function generateNotificationContent(opts: {
    kind: NotificationKind;
    name: string;
    memoryBlock: string;
    situation: string;
}): Promise<NotificationContent> {
    const { kind, name, memoryBlock, situation } = opts;

    const { object } = await generateObject({
        model: getModel(),
        schema: anthropicSafeSchema(NotificationContentSchema),
        maxRetries: LLM_MAX_RETRIES,
        messages: [
            { role: "system", content: SYSTEM },
            {
                role: "user",
                content:
                    `PATIENT NAME: ${name}\n\n` +
                    `${memoryBlock}\n\n` +
                    `NOTIFICATION TYPE: ${kind} — ${KIND_GUIDANCE[kind]}\n\n` +
                    `SITUATION: ${situation}\n\n` +
                    `Write the notification now.`,
            },
        ],
    });

    log.info(
        `generated ${kind} for "${name}" (${object.subject.length} char subject)`,
    );
    return NotificationContentSchema.parse(object);
}
