"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, Button, Chip } from "@/components/ui/primitives";
import { RecoveryProgressChart } from "@/components/recovery/RecoveryProgressChart";

const TARGETS = [
    {
        label: "Exercise",
        value: "3 movements/day",
        sub: "ankle pumps, walks, knee extensions",
    },
    {
        label: "Nutrition",
        value: "90 g protein",
        sub: "+ 2 L water, gentle fiber",
    },
    { label: "Sleep", value: "7 hrs", sub: "target quality: fair or better" },
    {
        label: "Symptoms",
        value: "Pain → 0",
        sub: "tracked daily; flag if it stalls",
    },
];

export function MgcPlanGeneration() {
    const [phase, setPhase] = useState<"result" | "generating">("result");
    const regenerate = () => {
        setPhase("generating");
        setTimeout(() => setPhase("result"), 1200); // in a handler, not an effect
    };

    if (phase === "generating") {
        return (
            <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-5 py-24 text-center">
                <Loader2 className="size-8 animate-spin text-accent" />
                <h2 className="text-[19px] font-semibold text-ink">
                    Generating your recovery plan
                </h2>
                <p className="max-w-sm text-[14px] text-ink-muted">
                    Mapping your surgery, screening, and readiness against the
                    clinical knowledge base…
                </p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-3xl space-y-6 px-5 py-10">
            <header className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-[26px] font-semibold text-ink">
                        Your draft recovery plan
                    </h1>
                    <p className="text-[15px] text-ink-muted">
                        Personalized from your onboarding, grounded in clinical
                        guidelines.
                    </p>
                </div>
                <Chip tone="attention" size="md">
                    Draft — pending verification
                </Chip>
            </header>

            <RecoveryProgressChart
                recoveryDays={28}
                baselinePain={8}
                series={[]}
                currentDay={1}
            />
            <p className="-mt-2 text-[14px] text-ink-muted">
                A tentative <strong className="text-ink">28-day</strong> arc.
                The dashed line is your expected recovery; we&apos;ll track your
                actual progress against it.
            </p>

            <Card className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-[15px] font-medium text-ink">
                        Plan confidence
                    </span>
                    <span className="text-[15px] font-semibold tabular-nums text-ink">
                        72%
                    </span>
                </div>
                <div className="h-2 w-full rounded-full bg-surface-sunken">
                    <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: "72%" }}
                    />
                </div>
                <p className="text-[13px] text-ink-muted">
                    Moderate — open-colectomy recovery varies between patients.
                    A physio and dietician review before it goes live.
                </p>
            </Card>

            <section className="space-y-3">
                <h2 className="text-[15px] font-semibold text-ink">
                    Per-priority targets
                </h2>
                <div className="grid grid-cols-2 gap-3">
                    {TARGETS.map((t) => (
                        <Card key={t.label}>
                            <div className="text-[13px] font-medium text-ink-subtle">
                                {t.label}
                            </div>
                            <div className="mt-1 text-[18px] font-semibold text-ink">
                                {t.value}
                            </div>
                            <div className="text-[13px] text-ink-muted">
                                {t.sub}
                            </div>
                        </Card>
                    ))}
                </div>
            </section>

            <div className="flex gap-3">
                <Button variant="secondary" onClick={regenerate}>
                    ↻ Regenerate
                </Button>
                <a href="/preview/mgc/verify" className="flex-1">
                    <Button size="lg" className="w-full">
                        Send for clinical review →
                    </Button>
                </a>
            </div>
        </div>
    );
}
