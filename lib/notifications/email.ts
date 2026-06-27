import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_KEY);
const FROM = process.env.RESEND_FROM ?? "onboarding@resend.dev";

export interface EmailPayload {
    to: string;
    subject: string;
    html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
    const { error } = await resend.emails.send({
        from: FROM,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
    });
    if (error) throw new Error(`Resend error: ${error.message}`);
}

// ── Templates ────────────────────────────────────────────────────────────────

export function dailyNudgeEmail(name: string): EmailPayload {
    return {
        to: "",
        subject: "Don't forget to log your progress today 💪",
        html: `
<p>Hi ${name},</p>
<p>Just a quick reminder to log your recovery progress for today. Staying on top of your daily check-in helps your care team keep your plan on track.</p>
<p><a href="${
            process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
        }/patient/dashboard">Open your dashboard →</a></p>
<p>Take care,<br/>Your recovery team</p>
`,
    };
}

export function painAlertEmail(name: string, detail: string): EmailPayload {
    return {
        to: "",
        subject: "We noticed your pain levels haven't been improving",
        html: `
<p>Hi ${name},</p>
<p>We've noticed that your recorded pain levels haven't been decreasing over the last few days. ${detail}</p>
<p>This is worth checking in with your care team about. Please contact your clinician or reach out through the app.</p>
<p><a href="${
            process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
        }/patient/dashboard">Open your dashboard →</a></p>
<p>Take care,<br/>Your recovery team</p>
`,
    };
}

export function lowComplianceEmail(
    name: string,
    missedDays: number,
): EmailPayload {
    return {
        to: "",
        subject:
            "We've missed seeing you — your recovery streak needs attention",
        html: `
<p>Hi ${name},</p>
<p>It looks like you haven't logged your recovery progress for ${missedDays} day${
            missedDays === 1 ? "" : "s"
        } in a row. Consistent daily logging helps us keep your recovery plan accurate and up to date.</p>
<p><a href="${
            process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
        }/patient/dashboard">Jump back in →</a></p>
<p>Take care,<br/>Your recovery team</p>
`,
    };
}
