"use client";

import { useState } from "react";
import { Card, Button, Chip } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const STEPS = ["Biometrics", "Medical screening", "Lifestyle", "Readiness"];
const inputClass =
    "mt-1.5 h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-[16px] text-ink";
const labelClass = "text-[14px] font-medium text-ink";

function BiometricsStep() {
    return (
        <div className="space-y-4">
            <div>
                <label className={labelClass}>Surgery</label>
                <div
                    className={cn(
                        inputClass,
                        "flex items-center text-ink-muted",
                    )}
                >
                    Open colectomy
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Age</label>
                    <div
                        className={cn(
                            inputClass,
                            "flex items-center text-ink-muted",
                        )}
                    >
                        67
                    </div>
                </div>
                <div>
                    <label className={labelClass}>Date of surgery</label>
                    <div
                        className={cn(
                            inputClass,
                            "flex items-center text-ink-muted",
                        )}
                    >
                        6 Jun 2026
                    </div>
                </div>
            </div>
        </div>
    );
}

function ScreeningStep() {
    return (
        <div className="space-y-3">
            <p className="text-[15px] text-ink-muted">
                Anything we should know to keep you safe?
            </p>
            {[
                "Diabetes",
                "On blood thinners",
                "Heart condition",
                "None of these",
            ].map((c, i) => (
                <button
                    key={c}
                    className={cn(
                        "flex w-full items-center gap-3 rounded-md border px-4 py-3 text-left text-[15px]",
                        i === 3
                            ? "border-accent bg-accent-soft text-accent-ink"
                            : "border-border text-ink hover:bg-surface-sunken",
                    )}
                >
                    <span
                        className={cn(
                            "size-5 rounded-full border-2",
                            i === 3
                                ? "border-accent bg-accent"
                                : "border-border-strong",
                        )}
                    />
                    {c}
                </button>
            ))}
        </div>
    );
}

function LifestyleStep() {
    return (
        <div className="space-y-3">
            <Chip tone="neutral" size="sm">
                Adaptive · the AI asks what matters for you
            </Chip>
            <p className="text-[18px] font-medium text-ink">
                Who&apos;s around to help at home this week?
            </p>
            <div className="space-y-2">
                {[
                    "My spouse, most of the day",
                    "Family on and off",
                    "Mostly on my own",
                ].map((o, i) => (
                    <button
                        key={o}
                        className={cn(
                            "w-full rounded-md border px-4 py-3 text-left text-[15px]",
                            i === 0
                                ? "border-accent bg-accent-soft text-accent-ink"
                                : "border-border text-ink hover:bg-surface-sunken",
                        )}
                    >
                        {o}
                    </button>
                ))}
            </div>
        </div>
    );
}

function ReadinessStep() {
    return (
        <div className="space-y-5">
            <p className="text-[15px] text-ink-muted">
                A quick sense of where you are today.
            </p>
            {[
                {
                    q: "How far can you walk before resting?",
                    val: "About 20 m",
                },
                { q: "Pain right now", val: "6 / 10" },
            ].map((r) => (
                <div key={r.q} className="space-y-2">
                    <div className="flex items-baseline justify-between">
                        <span className="text-[15px] text-ink">{r.q}</span>
                        <span className="text-[15px] font-semibold text-accent-ink tabular-nums">
                            {r.val}
                        </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-surface-sunken">
                        <div className="h-full w-3/5 rounded-full bg-accent" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function MgcOnboarding() {
    const [step, setStep] = useState(0);
    const last = step === STEPS.length - 1;

    return (
        <div className="mx-auto max-w-xl space-y-6 px-5 py-10">
            <header className="space-y-1">
                <h1 className="text-[26px] font-semibold text-ink">
                    Let&apos;s set up your recovery
                </h1>
                <p className="text-[15px] text-ink-muted">
                    A few short steps so your plan fits you.
                </p>
            </header>

            <div className="flex gap-1.5">
                {STEPS.map((s, i) => (
                    <div
                        key={s}
                        className={cn(
                            "h-1.5 flex-1 rounded-full transition-colors",
                            i <= step ? "bg-accent" : "bg-surface-sunken",
                        )}
                    />
                ))}
            </div>

            <Card className="space-y-4">
                <div>
                    <div className="text-[12px] font-medium uppercase tracking-wide text-ink-subtle">
                        Step {step + 1} of 4
                    </div>
                    <h2 className="mt-1 text-[22px] font-semibold text-ink">
                        {STEPS[step]}
                    </h2>
                </div>
                {step === 0 && <BiometricsStep />}
                {step === 1 && <ScreeningStep />}
                {step === 2 && <LifestyleStep />}
                {step === 3 && <ReadinessStep />}
                <div className="flex gap-3 border-t border-border pt-4">
                    {step > 0 && (
                        <Button
                            variant="secondary"
                            onClick={() => setStep((s) => s - 1)}
                        >
                            Back
                        </Button>
                    )}
                    {last ? (
                        <a href="/preview/mgc/plan" className="flex-1">
                            <Button size="lg" className="w-full">
                                Generate my plan →
                            </Button>
                        </a>
                    ) : (
                        <Button
                            size="lg"
                            className="flex-1"
                            onClick={() => setStep((s) => s + 1)}
                        >
                            Continue
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
}
