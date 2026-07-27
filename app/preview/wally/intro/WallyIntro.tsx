"use client";

import {
    Sprout,
    Stethoscope,
    HeartPulse,
    Target,
    CalendarCheck,
    BadgeCheck,
    LayoutGrid,
    type LucideIcon,
} from "lucide-react";
import { WallyLogo } from "@/components/wally/WallyLogo";

/**
 * "Enter Wally" — a calm, ~5-second overview screen that introduces Wally at a glance:
 * a personalised, adaptive recovery agent that shapes one plan around each patient's
 * surgery, comorbidities, goals and daily feedback. Restrained per DESIGN.md — cream
 * surface, one cornflower-blue accent, the green growth mark, type carrying hierarchy.
 * A single gentle entrance (reduced-motion safe); no wellness-app splash.
 */

const INPUTS: { icon: LucideIcon; label: string; hint: string }[] = [
    { icon: Stethoscope, label: "Surgery", hint: "your specific procedure" },
    { icon: HeartPulse, label: "Comorbidities", hint: "conditions you manage" },
    { icon: Target, label: "Goals", hint: "what you want back" },
    { icon: CalendarCheck, label: "Daily feedback", hint: "how you feel today" },
];

export function WallyIntro() {
    return (
        <main className="relative grid min-h-screen place-items-center overflow-hidden bg-bg px-6 py-16">
            <style>{`
                @keyframes wallyRise {
                    from { opacity: 0; transform: translateY(14px); }
                    to   { opacity: 1; transform: none; }
                }
                .wally-rise { animation: wallyRise 0.62s cubic-bezier(0.22, 1, 0.36, 1) both; }
                @media (prefers-reduced-motion: reduce) {
                    .wally-rise { animation: none; }
                }
            `}</style>

            {/* croppable nav back — out of the way of a clean recording */}
            <a
                href="/preview"
                className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-ink-subtle transition-colors hover:bg-surface-sunken hover:text-ink"
            >
                <LayoutGrid size={15} strokeWidth={1.75} />
                All pages
            </a>

            <div className="flex w-full max-w-xl flex-col items-center text-center">
                {/* brand mark — the green growth motif, softly haloed */}
                <div
                    className="wally-rise relative grid place-items-center"
                    style={{ animationDelay: "0ms" }}
                >
                    <div
                        aria-hidden
                        className="absolute size-32 rounded-full bg-accent-soft/70 blur-2xl"
                    />
                    <WallyLogo size={72} className="relative drop-shadow-md" />
                </div>

                {/* headline */}
                <h1
                    className="wally-rise mt-7 text-balance text-5xl font-bold tracking-[-0.02em] text-ink sm:text-6xl"
                    style={{ animationDelay: "80ms" }}
                >
                    Enter Wally.
                </h1>

                {/* the pitch */}
                <p
                    className="wally-rise mt-5 max-w-[34rem] text-pretty text-[19px] leading-relaxed text-ink"
                    style={{ animationDelay: "160ms" }}
                >
                    A personalised, adaptive recovery agent — it shapes one plan
                    around your surgery, the conditions you manage, your goals, and
                    how you feel each day.
                </p>

                {/* what it adapts to — a feature row, not cards */}
                <ul
                    className="wally-rise mt-11 flex w-full flex-wrap items-start justify-center gap-x-9 gap-y-7"
                    style={{ animationDelay: "260ms" }}
                >
                    {INPUTS.map(({ icon: Icon, label, hint }) => (
                        <li
                            key={label}
                            className="flex w-[7.5rem] flex-col items-center gap-2.5"
                        >
                            <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent-ink">
                                <Icon size={22} strokeWidth={1.9} />
                            </span>
                            <span className="text-[15px] font-semibold text-ink">
                                {label}
                            </span>
                            <span className="text-[13px] leading-snug text-ink-muted">
                                {hint}
                            </span>
                        </li>
                    ))}
                </ul>

                {/* the synthesis */}
                <p
                    className="wally-rise mt-10 inline-flex items-center gap-2.5 rounded-full bg-surface px-5 py-2.5 text-[15px] font-medium text-ink shadow-sm ring-1 ring-border"
                    style={{ animationDelay: "360ms" }}
                >
                    <Sprout size={17} className="text-[oklch(0.52_0.11_150)]" />
                    One plan — refined a little every day.
                </p>

                {/* trust cue */}
                <p
                    className="wally-rise mt-6 inline-flex items-center gap-1.5 text-[13.5px] text-ink-muted"
                    style={{ animationDelay: "440ms" }}
                >
                    <BadgeCheck size={15} className="text-accent-ink" />
                    Every plan reviewed by your physiotherapist and dietitian.
                </p>
            </div>
        </main>
    );
}
