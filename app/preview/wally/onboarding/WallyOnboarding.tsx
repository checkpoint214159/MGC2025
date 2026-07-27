"use client";

import { ReactNode, useState } from "react";
import { Check, Mars, Venus, CircleHelp, X, Plus, ChevronDown } from "lucide-react";
import { PhaseScope } from "@/components/wally/PhaseScope";
import { StepWizard } from "@/components/wally/StepWizard";
import { cn } from "@/lib/utils";

const inputBox = "w-full rounded-xl border border-border-strong bg-surface px-4 py-3.5 text-ink";

function StepHeader({ title, subtitle }: { title: string; subtitle: string }) {
    return (
        <div className="mb-5 text-center">
            <h2 className="text-[22px] font-bold text-accent-ink">{title}</h2>
            <p className="mt-1 text-[14px] text-ink-muted">{subtitle}</p>
        </div>
    );
}

function Segmented({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
    return (
        <div className="flex rounded-full border border-border bg-surface-sunken p-1">
            {options.map((o) => (
                <button
                    key={o}
                    type="button"
                    onClick={() => onChange(o)}
                    className={cn(
                        "flex-1 rounded-full py-1.5 text-[14px] font-medium transition-colors",
                        value === o ? "bg-surface text-accent-ink shadow-sm" : "text-ink-muted",
                    )}
                >
                    {o}
                </button>
            ))}
        </div>
    );
}

function RadioRow({ icon, iconClass, label, selected, onClick }: { icon: ReactNode; iconClass: string; label: string; selected: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                selected ? "border-accent bg-accent-soft/40" : "border-border hover:bg-surface-sunken",
            )}
        >
            <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", iconClass)}>{icon}</span>
            <span className="flex-1 text-[16px] font-medium text-ink">{label}</span>
            <span className={cn("grid size-6 place-items-center rounded-full border", selected ? "border-accent bg-accent text-ink-inverse" : "border-border-strong")}>
                {selected && <Check size={15} strokeWidth={3} />}
            </span>
        </button>
    );
}

export function WallyOnboarding() {
    // Empty-state defaults for demo recording: no gender chosen, no conditions added.
    // Unit toggles keep sensible defaults (cm/kg) since they're preferences, not entered data.
    const [gender, setGender] = useState("");
    const [heightUnit, setHeightUnit] = useState("cm");
    const [weightUnit, setWeightUnit] = useState("kg");
    const [conditions, setConditions] = useState<string[]>([]);

    const intro = (
        <div className="flex flex-col items-center text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src="/wally/wally_full.png"
                alt="Wally"
                className="h-44 w-auto mix-blend-multiply"
            />
            <p className="mt-2 text-[15px] font-medium text-ink">Your personal recovery companion.</p>
            <p className="mt-2 max-w-[16rem] text-[14px] text-ink-muted">
                I&apos;ll ask you a few questions to personalize your experience.
            </p>
        </div>
    );

    const ageStep = (
        <div>
            <StepHeader title="How old are you?" subtitle="This helps us tailor things for you." />
            <div className="flex items-center justify-between rounded-xl border border-border-strong px-5 py-4">
                <span className="text-[34px] font-bold tabular-nums text-ink-subtle">40</span>
                <span className="text-[15px] text-ink-muted">years old</span>
            </div>
            <div className="mt-3 flex flex-col items-center gap-1 text-ink-subtle">
                {[38, 39].map((n) => <span key={n} className="text-[15px]">{n}</span>)}
                <span className="my-0.5 w-full rounded-full bg-surface-sunken py-1 text-center text-[18px] font-semibold text-ink-subtle">40</span>
                {[41, 42].map((n) => <span key={n} className="text-[15px]">{n}</span>)}
            </div>
        </div>
    );

    const genderStep = (
        <div>
            <StepHeader title="What is your gender?" subtitle="You can always change this later." />
            <div className="space-y-2.5">
                <RadioRow icon={<Mars size={18} />} iconClass="bg-accent-soft text-accent-ink" label="Male" selected={gender === "Male"} onClick={() => setGender("Male")} />
                <RadioRow icon={<Venus size={18} />} iconClass="bg-critical-soft text-critical-ink" label="Female" selected={gender === "Female"} onClick={() => setGender("Female")} />
                <RadioRow icon={<CircleHelp size={18} />} iconClass="bg-surface-sunken text-ink-muted" label="Prefer not to say" selected={gender === "Prefer not to say"} onClick={() => setGender("Prefer not to say")} />
            </div>
        </div>
    );

    const heightStep = (
        <div>
            <StepHeader title="What is your height?" subtitle="Please enter your height." />
            <div className="flex items-center justify-between rounded-xl border border-border-strong px-5 py-4">
                <span className="text-[30px] font-bold tabular-nums text-ink-subtle">172</span>
                <span className="inline-flex items-center gap-1 text-[15px] text-ink-muted">{heightUnit} <ChevronDown size={16} /></span>
            </div>
            <div className="mt-4">
                <Segmented options={["cm", "ft / in"]} value={heightUnit} onChange={setHeightUnit} />
            </div>
        </div>
    );

    const weightStep = (
        <div>
            <StepHeader title="What is your weight?" subtitle="Please enter your weight." />
            <div className="flex items-center justify-between rounded-xl border border-border-strong px-5 py-4">
                <span className="text-[30px] font-bold tabular-nums text-ink-subtle">70</span>
                <span className="inline-flex items-center gap-1 text-[15px] text-ink-muted">{weightUnit} <ChevronDown size={16} /></span>
            </div>
            <div className="mt-4">
                <Segmented options={["kg", "lb"]} value={weightUnit} onChange={setWeightUnit} />
            </div>
        </div>
    );

    const conditionsStep = (
        <div>
            <StepHeader title="Any long-term medical conditions?" subtitle="You can enter more than one." />
            <div className="flex flex-wrap gap-2">
                {conditions.map((c) => (
                    <span key={c} className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-[13px] font-medium text-accent-ink">
                        {c}
                        <button type="button" aria-label={`Remove ${c}`} onClick={() => setConditions((cs) => cs.filter((x) => x !== c))}>
                            <X size={13} strokeWidth={2.5} />
                        </button>
                    </span>
                ))}
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-sunken px-3 py-1.5 text-[13px] font-medium text-ink-muted">
                    <Plus size={13} strokeWidth={2.5} /> Add more
                </span>
            </div>
            <input className={cn(inputBox, "mt-3 text-[15px] placeholder:text-ink-subtle focus:border-accent focus:outline-none focus:ring-2 focus:ring-ring")} placeholder="e.g. Hypertension, high cholesterol" />
            <div className="mt-6 text-center">
                <h3 className="text-[17px] font-semibold text-accent-ink">What surgery did you go for?</h3>
                <p className="mt-0.5 text-[13px] text-ink-muted">Please enter if any.</p>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl border border-border-strong px-4 py-3 text-[15px] text-ink">
                <span>Laparoscopic sigmoid colectomy <span className="text-ink-muted">(for colon cancer)</span></span>
                <ChevronDown size={18} className="shrink-0 text-ink-subtle" />
            </div>
        </div>
    );

    const surgeryStep = (
        <div>
            <StepHeader title="When was your surgery?" subtitle="So Wally can track your recovery day." />
            <label className="text-[13px] font-medium text-ink-muted">Date of surgery</label>
            <div className="mt-1.5 flex items-center justify-between rounded-xl border border-border-strong px-4 py-3.5 text-[16px] text-ink">
                <span>21 July 2026</span>
                <ChevronDown size={18} className="shrink-0 text-ink-subtle" />
            </div>
            <label className="mt-4 block text-[13px] font-medium text-ink-muted">Where are you recovering?</label>
            <div className="mt-1.5 flex items-center justify-between rounded-xl border border-border-strong px-4 py-3.5 text-[16px] text-ink">
                <span>At home</span>
                <ChevronDown size={18} className="shrink-0 text-ink-subtle" />
            </div>
        </div>
    );

    return (
        <PhaseScope phase="onboarding">
            <StepWizard
                phaseTag="Phase 1 · General Onboarding"
                phaseSubtitle="Basic information to help Wally personalise your experience."
                intro={intro}
                introCta="Get started"
                steps={[ageStep, genderStep, heightStep, weightStep, conditionsStep, surgeryStep]}
                finishLabel="Continue to assessment"
                finishHref="/preview/wally/assessment"
            />
        </PhaseScope>
    );
}
