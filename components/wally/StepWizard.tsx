"use client";

import { ReactNode, useState } from "react";
import { ChevronLeft, HelpCircle } from "lucide-react";
import { Button, Card } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/** The reference's dashed progress dots — filled up to and including the current step. */
function StepDots({ total, current }: { total: number; current: number }) {
    return (
        <div className="flex items-center justify-center gap-1.5 py-1">
            {Array.from({ length: total }).map((_, i) => (
                <span
                    key={i}
                    className={cn(
                        "h-1.5 rounded-full transition-all",
                        i === current ? "w-5 bg-accent" : i < current ? "w-3 bg-accent/50" : "w-3 bg-surface-sunken",
                    )}
                />
            ))}
        </div>
    );
}

/**
 * A reusable onboarding wizard: an optional Wally intro card, then a sequence of counted
 * steps ("1 of N") with the dashed dots and a Back/Next footer. The last step's button can
 * navigate onward via finishHref. Colour comes from the surrounding PhaseScope.
 */
export function StepWizard({
    phaseTag,
    phaseSubtitle,
    intro,
    introCta = "Get started",
    steps,
    finishLabel = "Finish",
    finishHref,
}: {
    phaseTag: string;
    phaseSubtitle: string;
    intro?: ReactNode;
    introCta?: string;
    steps: ReactNode[];
    finishLabel?: string;
    finishHref?: string;
}) {
    const [idx, setIdx] = useState(intro ? -1 : 0);
    const total = steps.length;
    const isLast = idx === total - 1;

    return (
        <div className="mx-auto max-w-2xl px-5 py-8">
            <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="rounded-md bg-accent-soft px-3 py-1.5 text-[12px] font-semibold uppercase tracking-wide text-accent-ink">
                    {phaseTag}
                </span>
                <span className="text-[14px] text-ink-muted">{phaseSubtitle}</span>
            </div>

            <Card className="mx-auto max-w-md p-6 md:p-7">
                {idx === -1 ? (
                    <div className="relative">
                        <button
                            type="button"
                            aria-label="Help"
                            className="absolute right-0 top-0 grid size-8 place-items-center rounded-full text-ink-subtle hover:bg-surface-sunken"
                        >
                            <HelpCircle size={18} strokeWidth={1.75} />
                        </button>
                        {intro}
                        <Button size="lg" className="mt-6 w-full" onClick={() => setIdx(0)}>
                            {introCta}
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="mb-5 flex items-center justify-between">
                            <button
                                type="button"
                                aria-label="Back"
                                onClick={() => setIdx(idx - 1)}
                                className="grid size-8 place-items-center rounded-full text-ink-muted hover:bg-surface-sunken"
                            >
                                <ChevronLeft size={20} strokeWidth={2} />
                            </button>
                            <span className="text-[14px] font-medium text-accent-ink">
                                {idx + 1} of {total}
                            </span>
                        </div>

                        <div className="min-h-[260px]">{steps[idx]}</div>

                        <div className="mt-6 space-y-4">
                            <StepDots total={total} current={idx} />
                            {isLast && finishHref ? (
                                <a href={finishHref} className="block">
                                    <Button size="lg" className="w-full">
                                        {finishLabel}
                                    </Button>
                                </a>
                            ) : (
                                <Button size="lg" className="w-full" onClick={() => setIdx(Math.min(idx + 1, total - 1))}>
                                    {isLast ? finishLabel : "Next"}
                                </Button>
                            )}
                        </div>
                    </>
                )}
            </Card>
        </div>
    );
}
