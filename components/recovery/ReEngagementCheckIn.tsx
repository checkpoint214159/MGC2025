"use client";

import { useState } from "react";
import { HeartPulse, X, Check } from "lucide-react";
import { Card, Button } from "@/components/ui/primitives";

/**
 * One-time, dismissible day-10–14 check-in. A single warm reflection question;
 * no new flow, no clinical advice. Dismissal is persisted by the caller.
 */
export function ReEngagementCheckIn({
    day,
    onDismiss,
}: {
    day: number | null;
    onDismiss: () => void;
}) {
    const [answered, setAnswered] = useState<string | null>(null);

    return (
        <Card className="mb-6 border-accent/30 bg-accent-soft/40">
            <div className="flex items-start gap-3">
                <div className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft">
                    <HeartPulse
                        size={18}
                        strokeWidth={1.75}
                        className="text-accent-ink"
                    />
                </div>
                <div className="flex-1 space-y-2">
                    <h3 className="text-[19px] font-semibold text-ink">
                        Two-week check-in
                    </h3>
                    {answered ? (
                        <p className="inline-flex items-center gap-1.5 text-[14px] text-progress-ink">
                            <Check size={15} strokeWidth={2.5} /> Thanks —
                            we&apos;ll keep that in mind.
                        </p>
                    ) : (
                        <>
                            <p className="text-[14px] text-ink-muted">
                                You&apos;re {day ?? "around two weeks"} days in
                                — often the trickiest stretch. How are you
                                really doing compared with last week?
                            </p>
                            <div className="flex flex-wrap gap-2 pt-1">
                                {["Better", "About the same", "Harder"].map(
                                    (opt, i) => (
                                        <Button
                                            key={opt}
                                            size="sm"
                                            variant={
                                                i === 0
                                                    ? "primary"
                                                    : "secondary"
                                            }
                                            onClick={() => setAnswered(opt)}
                                        >
                                            {opt}
                                        </Button>
                                    ),
                                )}
                            </div>
                        </>
                    )}
                </div>
                <button
                    type="button"
                    onClick={onDismiss}
                    aria-label="Dismiss check-in"
                    className="grid size-11 shrink-0 place-items-center rounded-md text-ink-subtle hover:bg-surface hover:text-ink"
                >
                    <X size={18} strokeWidth={1.75} />
                </button>
            </div>
        </Card>
    );
}
