"use client";

import { useState } from "react";
import { Footprints, Dumbbell, CheckCircle2 } from "lucide-react";
import { PARQ_QUESTIONS } from "@/lib/onboarding/screening";
import { PhaseScope } from "@/components/wally/PhaseScope";
import { StepWizard } from "@/components/wally/StepWizard";
import { WallyMascot } from "@/components/wally/WallyMascot";
import { cn } from "@/lib/utils";

const SARCF = [
    "How much difficulty do you have lifting and carrying 5 kg (about a bag of rice)?",
    "How much difficulty do you have walking across a room?",
    "How much difficulty do you have transferring from a chair or bed?",
    "How much difficulty do you have climbing a flight of 10 stairs?",
    "How many times have you fallen in the past year?",
];

function YesNo() {
    const [v, setV] = useState<"yes" | "no" | null>(null);
    return (
        <div className="mt-3 flex gap-6">
            {(["Yes", "No"] as const).map((label) => {
                const key = label.toLowerCase() as "yes" | "no";
                return (
                    <button key={key} type="button" onClick={() => setV(key)} className="inline-flex items-center gap-2 text-[15px] text-ink">
                        <span className={cn("grid size-5 place-items-center rounded-full border-2", v === key ? "border-accent" : "border-border-strong")}>
                            {v === key && <span className="size-2.5 rounded-full bg-accent" />}
                        </span>
                        {label}
                    </button>
                );
            })}
        </div>
    );
}

function ParqCard({ n, text }: { n: number; text: string }) {
    return (
        <div className="rounded-xl border border-border p-4">
            <div className="flex gap-2.5">
                <span className="text-[15px] font-semibold text-accent-ink tabular-nums">{n}.</span>
                <p className="text-[15px] leading-snug text-ink">{text}</p>
            </div>
            <div className="pl-6"><YesNo /></div>
        </div>
    );
}

function SarcRow({ icon, text }: { icon: React.ReactNode; text: string }) {
    const [v, setV] = useState<string | null>(null);
    return (
        <div className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-ink">{icon}</span>
            <p className="flex-1 text-[13px] leading-snug text-ink">{text}</p>
            <div className="flex shrink-0 gap-2.5">
                {["None", "Some", "Unable"].map((o) => (
                    <button key={o} type="button" onClick={() => setV(o)} className="inline-flex items-center gap-1 text-[12px] text-ink-muted">
                        <span className={cn("size-3.5 rounded-full border-2", v === o ? "border-accent bg-accent" : "border-border-strong")} />
                        {o}
                    </button>
                ))}
            </div>
        </div>
    );
}

export function WallyAssessment() {
    const intro = (
        <div className="flex flex-col items-center text-center">
            <h1 className="text-[24px] font-bold text-accent-ink">Initial Recovery Assessment</h1>
            <div className="mt-2"><WallyMascot pose="wave" size={120} /></div>
            <p className="mt-3 max-w-[19rem] text-[14px] text-ink-muted">
                We&apos;ll ask a few questions about your health, activity readiness and strength to support your recovery plan.
            </p>
            <div className="mt-4 w-full space-y-2 text-left">
                {[
                    { icon: <Footprints size={16} />, label: "Readiness for physical activity (PAR-Q)" },
                    { icon: <Dumbbell size={16} />, label: "Strength & function (SARC-F)" },
                    { icon: <CheckCircle2 size={16} />, label: "Malnutrition screening (MUST)" },
                ].map((b) => (
                    <div key={b.label} className="flex items-center gap-2.5">
                        <span className="grid size-8 place-items-center rounded-full bg-accent-soft text-accent-ink">{b.icon}</span>
                        <span className="text-[14px] font-medium text-ink">{b.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );

    const parqIntro = (
        <div>
            <h2 className="text-center text-[18px] font-semibold text-accent-ink">Readiness for Physical Activity (PAR-Q)</h2>
            <p className="mb-4 text-center text-[13px] text-ink-muted">Please answer the following questions.</p>
            <div className="space-y-3">
                <ParqCard n={1} text={PARQ_QUESTIONS[0].text} />
                <ParqCard n={2} text={PARQ_QUESTIONS[1].text} />
            </div>
        </div>
    );

    const parqMid = (
        <div>
            <h2 className="text-center text-[18px] font-semibold text-accent-ink">Readiness for Physical Activity (PAR-Q)</h2>
            <p className="mb-4 text-center text-[13px] text-ink-muted">Please answer the following questions.</p>
            <div className="space-y-3">
                <ParqCard n={3} text={PARQ_QUESTIONS[2].text} />
                <ParqCard n={4} text={PARQ_QUESTIONS[3].text} />
            </div>
        </div>
    );

    const parqLast = (
        <div>
            <h2 className="text-center text-[18px] font-semibold text-accent-ink">Readiness for Physical Activity (PAR-Q)</h2>
            <p className="mb-4 text-center text-[13px] text-ink-muted">Please answer the following questions.</p>
            <div className="space-y-3">
                <ParqCard n={5} text={PARQ_QUESTIONS[4].text} />
                <ParqCard n={6} text={PARQ_QUESTIONS[5].text} />
            </div>
        </div>
    );

    const sarcStep = (
        <div>
            <h2 className="text-center text-[16px] font-semibold leading-snug text-accent-ink">
                Strength, Walking, Rise from a Chair, Climb Stairs and Falls (SARC-F)
            </h2>
            <p className="mb-4 text-center text-[13px] text-ink-muted">Please answer the following questions.</p>
            <div className="space-y-2">
                {SARCF.map((t, i) => (
                    <SarcRow key={i} icon={<span className="text-[12px] font-bold">{i + 1}</span>} text={t} />
                ))}
            </div>
        </div>
    );

    const summary = (
        <div className="flex flex-col items-center text-center">
            <h2 className="text-[20px] font-bold text-accent-ink">Assessment Summary</h2>
            <div className="mt-2"><WallyMascot pose="thumbs-up" size={120} /></div>
            <p className="mt-4 inline-flex items-center gap-2 text-[18px] font-semibold text-accent-ink">
                <CheckCircle2 size={20} strokeWidth={2} /> Thank you!
            </p>
            <p className="mt-2 max-w-[18rem] text-[14px] text-ink-muted">
                Based on your answers, Wally will personalise your recovery plan to support a safe and effective recovery.
            </p>
        </div>
    );

    return (
        <PhaseScope phase="assessment">
            <StepWizard
                phaseTag="Phase 2 · Initial Assessment"
                phaseSubtitle="Helps Wally understand your readiness and strength."
                intro={intro}
                introCta="Let's begin"
                steps={[parqIntro, parqMid, parqLast, sarcStep, summary]}
                finishLabel="Continue to preferences"
                finishHref="/preview/wally/lifestyle"
            />
        </PhaseScope>
    );
}
