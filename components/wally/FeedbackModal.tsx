"use client";

import { useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { PhaseScope } from "./PhaseScope";
import { cn } from "@/lib/utils";

/**
 * The post-task "After-Action Review" — surfaced when a patient marks a task done. Collects
 * a pain score, breathlessness, perceived difficulty and an optional note, which feed the
 * dynamic plan + the clinician flags. Mock-only: Submit/Skip just close the dialog.
 */
const BREATHLESSNESS = ["None", "Mild", "Moderate", "Severe"];
const DIFFICULTY = ["Very Easy", "Easy", "Moderate", "Hard", "Very Hard"];

function Segmented({
    options,
    value,
    onChange,
}: {
    options: string[];
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {options.map((o) => (
                <button
                    key={o}
                    type="button"
                    onClick={() => onChange(o)}
                    className={cn(
                        "rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
                        value === o
                            ? "border-accent bg-accent-soft text-accent-ink"
                            : "border-border text-ink-muted hover:bg-surface-sunken",
                    )}
                >
                    {o}
                </button>
            ))}
        </div>
    );
}

export function FeedbackModal({
    taskName,
    onClose,
}: {
    taskName: string;
    onClose: () => void;
}) {
    const [pain, setPain] = useState(2);
    const [breath, setBreath] = useState("None");
    const [difficulty, setDifficulty] = useState("Very Easy");
    const [note, setNote] = useState("Felt pretty good today, I think I can walk longer no problem.");

    return (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onClick={onClose}>
            <PhaseScope phase="assessment" className="w-full max-w-md">
                <div
                    className="max-h-[88vh] overflow-y-auto rounded-xl border border-border bg-surface p-5 shadow-lg"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="mb-4 flex items-start gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-ink-inverse">
                            <CheckCircle2 size={20} strokeWidth={2} />
                        </span>
                        <div className="flex-1">
                            <h2 className="text-[18px] font-semibold text-ink">How did your {taskName} go?</h2>
                            <p className="text-[13px] text-ink-muted">
                                Your feedback helps us keep you safe and adjust your plan if needed.
                            </p>
                        </div>
                        <button type="button" aria-label="Close" onClick={onClose} className="grid size-8 place-items-center rounded-full text-ink-subtle hover:bg-surface-sunken">
                            <X size={18} strokeWidth={1.75} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <section className="rounded-lg border border-border p-3.5">
                            <h3 className="text-[14px] font-semibold text-ink">1. Pain Score (0–10)</h3>
                            <p className="mb-2.5 text-[12px] text-ink-muted">0 = No pain, 10 = Worst pain imaginable</p>
                            <div className="flex flex-wrap gap-1.5">
                                {Array.from({ length: 11 }).map((_, n) => (
                                    <button
                                        key={n}
                                        type="button"
                                        onClick={() => setPain(n)}
                                        className={cn(
                                            "size-8 rounded-full text-[14px] font-medium tabular-nums transition-colors",
                                            pain === n ? "bg-accent text-ink-inverse" : "border border-border text-ink-muted hover:bg-surface-sunken",
                                        )}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section className="rounded-lg border border-border p-3.5">
                            <h3 className="text-[14px] font-semibold text-ink">2. Breathlessness</h3>
                            <p className="mb-2.5 text-[12px] text-ink-muted">How short of breath did you feel?</p>
                            <Segmented options={BREATHLESSNESS} value={breath} onChange={setBreath} />
                        </section>

                        <section className="rounded-lg border border-border p-3.5">
                            <h3 className="text-[14px] font-semibold text-ink">3. Difficulty Level</h3>
                            <p className="mb-2.5 text-[12px] text-ink-muted">How would you rate the difficulty?</p>
                            <Segmented options={DIFFICULTY} value={difficulty} onChange={setDifficulty} />
                        </section>

                        <section className="rounded-lg border border-border p-3.5">
                            <h3 className="text-[14px] font-semibold text-ink">
                                4. Any Feedback? <span className="font-normal text-ink-subtle">(Optional)</span>
                            </h3>
                            <p className="mb-2.5 text-[12px] text-ink-muted">Share how it went or anything you want us to know.</p>
                            <textarea
                                value={note}
                                maxLength={200}
                                onChange={(e) => setNote(e.target.value)}
                                rows={2}
                                className="w-full resize-none rounded-md border border-border-strong bg-surface px-3 py-2 text-[14px] text-ink"
                            />
                            <div className="mt-1 text-right text-[12px] text-ink-subtle tabular-nums">{note.length}/200</div>
                        </section>
                    </div>

                    <div className="mt-5 flex gap-3">
                        <Button variant="secondary" className="flex-1" onClick={onClose}>
                            Skip
                        </Button>
                        <Button className="flex-1" onClick={onClose}>
                            Submit Feedback
                        </Button>
                    </div>
                </div>
            </PhaseScope>
        </div>
    );
}
