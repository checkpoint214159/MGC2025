"use client";

import {
    ClipboardList,
    Sparkles,
    BadgeCheck,
    LayoutDashboard,
    ShieldAlert,
    ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/primitives";

const SCREENS = [
    {
        href: "/preview/mgc/onboarding",
        n: "S1",
        phase: "Initial",
        icon: ClipboardList,
        title: "Onboarding",
        desc: "Biometrics → medical screening → lifestyle → readiness survey.",
    },
    {
        href: "/preview/mgc/plan",
        n: "S2",
        phase: "Initial",
        icon: Sparkles,
        title: "Plan generation",
        desc: "A personalized X-day recovery arc + per-priority targets, with a confidence estimate.",
    },
    {
        href: "/preview/mgc/verify",
        n: "S3",
        phase: "Initial",
        icon: BadgeCheck,
        title: "Clinical verification",
        desc: "Physio signs off Exercise, Dietician signs off Nutrition → the plan goes active.",
    },
    {
        href: "/preview/mgc/patient",
        n: "S4",
        phase: "Loop",
        icon: LayoutDashboard,
        title: "Patient dashboard",
        desc: "The recovery arc, four priorities, and the daily Start → Do → AAR loop.",
    },
    {
        href: "/preview/mgc/admin",
        n: "S7",
        phase: "Loop",
        icon: ShieldAlert,
        title: "Clinician monitoring",
        desc: "Stalled recovery (pain not decreasing) raises a flag for human review.",
    },
];

export function MgcHub() {
    return (
        <div className="mx-auto max-w-3xl space-y-8 px-5 py-12">
            <header className="space-y-2">
                <h1 className="text-[32px] font-semibold text-ink">
                    Post-surgery recovery
                </h1>
                <p className="max-w-prose text-[16px] text-ink-muted">
                    A patient is onboarded, given a clinically-validated
                    recovery plan with an X-day arc, then guided through a daily
                    recovery loop — with a clinician flagged if recovery stalls.
                    Click through the flow:
                </p>
            </header>

            {(["Initial", "Loop"] as const).map((phase) => (
                <section key={phase} className="space-y-3">
                    <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-subtle">
                        {phase === "Initial"
                            ? "Initial — one-time setup"
                            : "Loop — daily, until recovered"}
                    </h2>
                    <div className="space-y-2.5">
                        {SCREENS.filter((s) => s.phase === phase).map((s) => {
                            const Icon = s.icon;
                            return (
                                <a
                                    key={s.href}
                                    href={s.href}
                                    className="block focus:outline-none"
                                >
                                    <Card
                                        interactive
                                        className="flex items-center gap-4"
                                    >
                                        <div className="grid size-10 shrink-0 place-items-center rounded-md bg-accent-soft text-accent-ink">
                                            <Icon
                                                size={20}
                                                strokeWidth={1.75}
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-[12px] text-ink-subtle">
                                                    {s.n}
                                                </span>
                                                <h3 className="text-[16px] font-semibold text-ink">
                                                    {s.title}
                                                </h3>
                                            </div>
                                            <p className="text-[14px] text-ink-muted">
                                                {s.desc}
                                            </p>
                                        </div>
                                        <ArrowRight
                                            size={18}
                                            strokeWidth={1.75}
                                            className="shrink-0 text-ink-subtle"
                                        />
                                    </Card>
                                </a>
                            );
                        })}
                    </div>
                </section>
            ))}
        </div>
    );
}
