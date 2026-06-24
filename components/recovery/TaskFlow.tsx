"use client";

import { ReactNode, useState } from "react";
import { Play, Check } from "lucide-react";
import { Card, Button } from "@/components/ui/primitives";

/**
 * The daily task interaction (S5): Click Start → Do (guidance while in progress) → AAR
 * (a one-tap "how did that feel?"). Additive over the existing logging widgets.
 */
type Phase = "idle" | "doing" | "aar";

export function TaskFlow({
    title,
    detail,
    guidance,
    chip,
    onComplete,
}: {
    title: string;
    detail: string;
    guidance: string;
    chip?: ReactNode;
    onComplete?: (comfort: string) => void;
}) {
    const [phase, setPhase] = useState<Phase>("idle");
    const [comfort, setComfort] = useState<string | null>(null);

    return (
        <Card>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="text-[16px] font-semibold text-ink">
                        {title}
                    </h3>
                    <p className="text-[14px] text-ink-muted">{detail}</p>
                </div>
                {chip}
            </div>

            {phase === "idle" && (
                <Button
                    className="mt-4"
                    size="lg"
                    onClick={() => setPhase("doing")}
                >
                    <Play size={16} strokeWidth={2} /> Start
                </Button>
            )}

            {phase === "doing" && (
                <div className="mt-4 space-y-3">
                    <div className="rounded-md bg-surface-sunken p-4 text-[15px] text-ink-muted">
                        {guidance}
                    </div>
                    <Button size="lg" onClick={() => setPhase("aar")}>
                        Finish
                    </Button>
                </div>
            )}

            {phase === "aar" &&
                (comfort ? (
                    <p className="mt-4 inline-flex items-center gap-1.5 text-[14px] text-progress-ink">
                        <Check size={15} strokeWidth={2.5} /> Logged — “
                        {comfort}”. Nicely done.
                    </p>
                ) : (
                    <div className="mt-4 space-y-2">
                        <p className="text-[15px] text-ink">
                            How did that feel?
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {["Comfortable", "A bit hard", "Too much"].map(
                                (c, i) => (
                                    <Button
                                        key={c}
                                        size="md"
                                        variant={
                                            i === 0 ? "primary" : "secondary"
                                        }
                                        onClick={() => {
                                            setComfort(c);
                                            onComplete?.(c);
                                        }}
                                    >
                                        {c}
                                    </Button>
                                ),
                            )}
                        </div>
                    </div>
                ))}
        </Card>
    );
}
