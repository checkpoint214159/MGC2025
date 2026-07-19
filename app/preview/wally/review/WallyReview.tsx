"use client";

import { useEffect, useState } from "react";
import {
    Footprints,
    Salad,
    Clock,
    ArrowRight,
    Check,
    ShieldCheck,
} from "lucide-react";
import { WallyMascot } from "@/components/wally/WallyMascot";
import { Button } from "@/components/ui/primitives";

/**
 * Post-questionnaire holding screen: Wally has drafted the plan, and it is pending
 * review by the physiotherapist + dietitian before it goes live. For the demo the
 * sign-offs come through after a short beat, and the CTA continues to the plan; a
 * secondary link jumps into the clinician validation screen.
 */
const REVIEWERS = [
    {
        icon: <Footprints size={20} />,
        role: "Physiotherapist",
        owns: "Exercise plan",
    },
    { icon: <Salad size={20} />, role: "Dietitian", owns: "Nutrition plan" },
];

const APPROVE_AFTER_MS = 2400;

export function WallyReview() {
    const [approved, setApproved] = useState(false);
    useEffect(() => {
        const t = setTimeout(() => setApproved(true), APPROVE_AFTER_MS);
        return () => clearTimeout(t);
    }, []);

    return (
        <div className="mx-auto max-w-md px-5 py-10">
            <div className="flex flex-col items-center text-center">
                <WallyMascot pose="wave" size={96} />
                <h1 className="mt-4 text-[26px] font-bold leading-tight text-ink">
                    Wally&apos;s plan is with your care team
                </h1>
                <p className="mt-2 max-w-[21rem] text-[14.5px] leading-snug text-ink-muted">
                    Thanks, Mr Tan — that&apos;s everything Wally needs. A draft
                    recovery plan has been prepared and sent to your clinicians
                    to check and sign off before it goes live.
                </p>
            </div>

            <div className="mt-6 space-y-2.5">
                {REVIEWERS.map((r) => (
                    <div
                        key={r.role}
                        className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4"
                    >
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-ink">
                            {r.icon}
                        </span>
                        <div className="flex-1">
                            <div className="text-[15px] font-semibold text-ink">
                                {r.role}
                            </div>
                            <div className="text-[13px] text-ink-muted">
                                Reviewing the {r.owns.toLowerCase()}
                            </div>
                        </div>
                        {approved ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-progress-soft px-2.5 py-1 text-[12px] font-medium text-progress-ink">
                                <Check size={12} strokeWidth={2.5} /> Approved
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-attention-soft px-2.5 py-1 text-[12px] font-medium text-attention-ink">
                                <span className="size-1.5 animate-pulse rounded-full bg-attention" />{" "}
                                Pending
                            </span>
                        )}
                    </div>
                ))}
            </div>

            <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-accent-soft/40 p-4">
                {approved ? (
                    <>
                        <ShieldCheck
                            size={16}
                            className="mt-0.5 shrink-0 text-accent-ink"
                        />
                        <p className="text-[13px] leading-snug text-accent-ink">
                            Both clinicians have signed off — your recovery plan
                            is ready.
                        </p>
                    </>
                ) : (
                    <>
                        <Clock
                            size={16}
                            className="mt-0.5 shrink-0 text-accent-ink"
                        />
                        <p className="text-[13px] leading-snug text-accent-ink">
                            This usually takes less than one working day. Wally
                            will let you know the moment your plan is approved.
                        </p>
                    </>
                )}
            </div>

            <div className="mt-8 flex flex-col items-center gap-2">
                {approved ? (
                    <a href="/preview/wally/plan" className="w-full">
                        <Button size="lg" className="w-full">
                            See my recovery plan <ArrowRight size={18} />
                        </Button>
                    </a>
                ) : (
                    <Button size="lg" className="w-full" disabled>
                        Awaiting sign-off…
                    </Button>
                )}
                <p className="text-[12px] text-ink-subtle">
                    Demo shortcut —{" "}
                    <a
                        href="/preview/mgc/verify"
                        className="font-medium text-accent-ink hover:underline"
                    >
                        see what your physio &amp; dietitian see
                    </a>
                    .
                </p>
            </div>
        </div>
    );
}
