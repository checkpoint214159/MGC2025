"use client";

import { Chip } from "@/components/ui/primitives";
import { WallyLogo } from "@/components/wally/WallyLogo";

/**
 * "Nudges" — the patient-facing engagement notifications. Gentle, context-aware,
 * non-clinical prompts (see lib/engagement/nudge.ts). At most one per moment; each is a
 * quick, low-pressure tap. Rendered in the Wally design language: cream surface, phase-
 * coloured category chips, the sprout brand mark.
 */

type Tone = "accent" | "progress" | "attention";

const NUDGES: {
    category: string;
    tone: Tone;
    time: string;
    title: string;
    body: string;
}[] = [
    {
        category: "Sleep",
        tone: "accent",
        time: "now",
        title: "How did you sleep?",
        body: "A quick tap tunes today's plan — that's all Wally needs.",
    },
    {
        category: "Exercise",
        tone: "accent",
        time: "9:40 AM",
        title: "Movements, when you're ready",
        body: "1 of 3 done — nicely paced. Next up: a short hallway walk.",
    },
    {
        category: "Nutrition",
        tone: "progress",
        time: "12:30 PM",
        title: "Just one thing left today",
        body: "A little protein this lunch. It's a quick one to log.",
    },
    {
        category: "Hydration",
        tone: "accent",
        time: "3:15 PM",
        title: "Halfway on water",
        body: "A couple more glasses by tonight? No pressure if not.",
    },
    {
        category: "Symptoms",
        tone: "attention",
        time: "8:20 PM",
        title: "Evening check-in",
        body: "How's your pain today? Two taps and you're done.",
    },
    {
        category: "Milestone",
        tone: "attention",
        time: "9:00 PM",
        title: "5 days logged in a row",
        body: "Well held, Mr Tan. Small steps are adding up.",
    },
];

/** The Wally sea-lion brand mark. */
function WallyMark() {
    return <WallyLogo size={36} />;
}

export function WallyNudges() {
    return (
        <div className="mx-auto max-w-4xl px-5 py-8">
            <div className="mb-6">
                <span className="rounded-md bg-accent-soft px-3 py-1.5 text-[12px] font-semibold uppercase tracking-wide text-accent-ink">
                    Patient engagement
                </span>
                <h1 className="mt-3 text-[28px] font-bold text-ink">Nudges</h1>
                <p className="mt-1 max-w-2xl text-[15px] text-ink-muted">
                    Gentle, context-aware notifications that keep recovery on track —
                    at most one per moment, never clinical, and always a quick tap to
                    act on.
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                {NUDGES.map((n) => (
                    <article
                        key={n.title}
                        className="rounded-2xl border border-border bg-surface p-5 shadow-sm transition-shadow duration-150 hover:shadow-md"
                    >
                        <header className="flex items-center gap-2.5">
                            <WallyMark />
                            <span className="text-[15px] font-bold text-ink">
                                Wally
                            </span>
                            <Chip tone={n.tone}>{n.category}</Chip>
                            <span className="ml-auto text-[13px] text-ink-subtle">
                                {n.time}
                            </span>
                        </header>
                        <h3 className="mt-3.5 text-[19px] font-bold leading-snug text-ink">
                            {n.title}
                        </h3>
                        <p className="mt-1.5 text-[15px] leading-relaxed text-ink-muted">
                            {n.body}
                        </p>
                    </article>
                ))}
            </div>
        </div>
    );
}
