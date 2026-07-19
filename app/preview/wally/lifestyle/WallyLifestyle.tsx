"use client";

import { Sparkles } from "lucide-react";
import { PhaseScope } from "@/components/wally/PhaseScope";
import { StepWizard } from "@/components/wally/StepWizard";
import { WallyMascot } from "@/components/wally/WallyMascot";
import { Chip } from "@/components/ui/primitives";

const QUESTIONS = [
    {
        title: "What activities do you enjoy?",
        subtitle:
            "Tell us about any physical activities, sports or hobbies you enjoy.",
        answer: "Going on hikes and playing badminton",
    },
    {
        title: "What exercise equipment do you have access to?",
        subtitle: "Include any facilities or equipment available to you.",
        answer: "Condo gym and swimming pool",
    },
    {
        title: "Any food allergies?",
        subtitle: "List any food allergies or intolerances you have.",
        answer: "No allergies",
    },
    {
        title: "What are your goals for your recovery?",
        subtitle: "What would you like to achieve through your recovery?",
        answer: "Reduce pain, get back to hiking and improve strength",
    },
    {
        title: "Is there anything else you'd like us to know?",
        subtitle:
            "Any other information that can help us personalise your plan?",
        answer: "",
    },
];

export function WallyLifestyle() {
    const intro = (
        <div className="flex flex-col items-center text-center">
            <WallyMascot pose="wave" />
            <h1 className="mt-3 text-[26px] font-bold text-accent-ink">
                Getting to know you
            </h1>
            <p className="mt-2 max-w-[18rem] text-[14px] text-ink-muted">
                We&apos;ll ask you a few questions about your preferences to
                better personalise your recovery plan.
            </p>
        </div>
    );

    const steps = QUESTIONS.map((q) => (
        <div key={q.title}>
            <div className="mb-1 flex justify-center">
                <Chip tone="accent" size="sm">
                    <Sparkles size={12} /> Adaptive · the AI asks what matters
                    for you
                </Chip>
            </div>
            <div className="mb-4 text-center">
                <h2 className="text-[20px] font-bold leading-snug text-accent-ink">
                    {q.title}
                </h2>
                <p className="mt-1.5 text-[14px] text-ink-muted">
                    {q.subtitle}
                </p>
            </div>
            <textarea
                defaultValue={q.answer}
                placeholder="Type your answer here…"
                rows={5}
                readOnly
                className="w-full resize-none rounded-xl border border-border-strong bg-surface px-4 py-3 text-[16px] text-ink placeholder:text-ink-subtle"
            />
        </div>
    ));

    return (
        <PhaseScope phase="lifestyle">
            <StepWizard
                phaseTag="Phase 3 · Getting to Know You"
                phaseSubtitle="Help us understand your preferences so we can better personalise your recovery plan."
                intro={intro}
                introCta="Let's continue"
                steps={steps}
                finishLabel="Continue to care plan upload"
                finishHref="/preview/wally/discharge"
            />
        </PhaseScope>
    );
}
