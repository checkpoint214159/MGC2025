"use client";

import { useState } from "react";
import { BadgeCheck, Check, MessageSquare, ArrowRight } from "lucide-react";
import { Card, Chip, Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/**
 * Clinical validation of Wally's draft plan: the physiotherapist owns Exercise, the
 * dietitian owns Nutrition. Entries are editable inline; when both roles sign off the
 * plan flips active and links back to the patient-facing recovery plan.
 */
type Item = { name: string; detail: string; intensity?: string };

const EXERCISE_DRAFT: Item[] = [
    { name: "Daily walks", detail: "3–4× per day · 20–30 min total", intensity: "Easy" },
    { name: "Sit-to-stand", detail: "10 reps · 2× per day", intensity: "Easy" },
    { name: "Marching on the spot", detail: "1–2 min · 2× per day", intensity: "Easy" },
    { name: "Deep breathing", detail: "10 breaths every hour while awake", intensity: "Easy" },
];
const NUTRITION_DRAFT: Item[] = [
    { name: "Calories", detail: "1800–2000 kcal per day" },
    { name: "Protein", detail: "80–100 g per day" },
    { name: "Hydration", detail: "6–8 glasses of water per day" },
    { name: "Go slow with", detail: "Oily + gas-forming foods initially" },
];

function SignSlot({ label, sub, signed }: { label: string; sub: string; signed: boolean }) {
    return (
        <div className={cn("flex flex-1 items-center gap-2.5 rounded-md border px-3 py-2.5", signed ? "border-progress/30 bg-progress-soft/40" : "border-border bg-surface")}>
            <div className={cn("grid size-7 place-items-center rounded-full", signed ? "bg-progress text-ink-inverse" : "bg-surface-sunken text-ink-subtle")}>
                {signed ? <Check size={15} strokeWidth={2.5} /> : <span className="size-1.5 rounded-full bg-current" />}
            </div>
            <div className="leading-tight">
                <div className="text-[14px] font-medium text-ink">{label}</div>
                <div className="text-[12px] text-ink-muted">{signed ? "Signed off" : `${sub} · pending`}</div>
            </div>
        </div>
    );
}

function EditableList({ items, onChange }: { items: Item[]; onChange: (items: Item[]) => void }) {
    const update = (i: number, patch: Partial<Item>) => onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
    return (
        <ul className="divide-y divide-border rounded-md border border-border">
            {items.map((item, i) => (
                <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                        <input
                            value={item.name}
                            onChange={(e) => update(i, { name: e.target.value })}
                            aria-label={`Item ${i + 1} name`}
                            className="w-full rounded-sm bg-transparent text-[15px] font-medium text-ink outline-none focus:bg-surface-sunken/60 focus:px-1"
                        />
                        <input
                            value={item.detail}
                            onChange={(e) => update(i, { detail: e.target.value })}
                            aria-label={`Item ${i + 1} detail`}
                            className="w-full rounded-sm bg-transparent text-[13px] text-ink-muted outline-none focus:bg-surface-sunken/60 focus:px-1"
                        />
                    </div>
                    {item.intensity && <Chip tone="accent" size="sm">{item.intensity}</Chip>}
                </li>
            ))}
        </ul>
    );
}

export function MgcClinicalVerify() {
    const [role, setRole] = useState<"pt" | "dt">("pt");
    const [ptSigned, setPtSigned] = useState(false);
    const [dtSigned, setDtSigned] = useState(false);
    const [exercise, setExercise] = useState<Item[]>(EXERCISE_DRAFT);
    const [nutrition, setNutrition] = useState<Item[]>(NUTRITION_DRAFT);
    const active = ptSigned && dtSigned;

    return (
        <div className="mx-auto max-w-3xl space-y-6 px-5 py-10">
            <header className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-[26px] font-semibold text-ink">Validate Wally&apos;s plan — Mr Tan</h1>
                    <p className="text-[15px] text-ink-muted">Laparoscopic sigmoid colectomy · 6-week recovery arc · drafted by Wally</p>
                </div>
                <Chip tone={active ? "progress" : "attention"} size="md">{active ? "Active" : "Draft"}</Chip>
            </header>

            <div className="flex gap-3">
                <SignSlot label="Physiotherapist" sub="Exercise" signed={ptSigned} />
                <SignSlot label="Dietitian" sub="Nutrition" signed={dtSigned} />
            </div>

            {active ? (
                <Card className="space-y-2 border-progress/20 bg-progress-soft/30 p-8 text-center">
                    <BadgeCheck size={32} strokeWidth={1.75} className="mx-auto text-progress" />
                    <h2 className="text-[19px] font-semibold text-ink">Plan verified &amp; active</h2>
                    <p className="text-[15px] text-ink-muted">
                        Both clinicians have signed off. Mr Tan&apos;s recovery plan is now live, and Wally takes it from here.
                    </p>
                    <a href="/preview/wally/plan" className="inline-block pt-2">
                        <Button size="lg">See the final recovery plan <ArrowRight size={16} /></Button>
                    </a>
                </Card>
            ) : (
                <>
                    <div className="flex w-fit gap-1 rounded-md bg-surface-sunken p-1">
                        {(["pt", "dt"] as const).map((r) => (
                            <button
                                key={r}
                                onClick={() => setRole(r)}
                                className={cn("h-9 rounded px-3 text-[14px] font-medium", role === r ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink")}
                            >
                                {r === "pt" ? "Physio view" : "Dietician view"}
                            </button>
                        ))}
                    </div>

                    <Card className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[17px] font-semibold text-ink">{role === "pt" ? "Exercise plan" : "Nutrition plan"}</h3>
                            <span className="text-[13px] text-ink-subtle">tap any field to edit</span>
                        </div>
                        {role === "pt" ? (
                            <EditableList items={exercise} onChange={setExercise} />
                        ) : (
                            <EditableList items={nutrition} onChange={setNutrition} />
                        )}
                        <button className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink">
                            <MessageSquare size={15} strokeWidth={1.75} /> Add a comment…
                        </button>
                        <div className="flex justify-end border-t border-border pt-3">
                            {role === "pt" ? (
                                <Button onClick={() => setPtSigned(true)} disabled={ptSigned}>{ptSigned ? "Signed ✓" : "Sign off Exercise"}</Button>
                            ) : (
                                <Button onClick={() => setDtSigned(true)} disabled={dtSigned}>{dtSigned ? "Signed ✓" : "Sign off Nutrition"}</Button>
                            )}
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
}
