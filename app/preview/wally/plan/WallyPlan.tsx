"use client";

import { ReactNode } from "react";
import {
    User, CalendarDays, ClipboardCheck, Target, Footprints, Dumbbell, Mountain, Apple,
    Activity, Wind, Bike, Clock, Salad, Flame, Beef, Carrot, Droplets, TriangleAlert,
    Thermometer, HeartPulse, Ban, ArrowRight, BadgeCheck,
} from "lucide-react";
import { PhaseScope } from "@/components/wally/PhaseScope";
import { Button } from "@/components/ui/primitives";

function ColumnHeader({ icon, title, phase }: { icon: ReactNode; title: string; phase: "onboarding" | "assessment" }) {
    return (
        <div className="flex items-center gap-2.5 rounded-t-xl bg-accent px-4 py-3 text-ink-inverse">
            <span className="shrink-0">{icon}</span>
            <h3 className="text-[15px] font-bold uppercase tracking-wide">{title}</h3>
            <span className="sr-only">{phase}</span>
        </div>
    );
}

function Block({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
    return (
        <div className="flex gap-3">
            <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-ink">{icon}</span>
            <div className="flex-1">
                <h4 className="text-[14px] font-semibold text-ink">{title}</h4>
                <div className="mt-1 space-y-0.5 text-[13.5px] leading-snug text-ink-muted">{children}</div>
            </div>
        </div>
    );
}

const GOALS = [
    { icon: <Activity size={20} />, label: "Reduce pain and improve mobility" },
    { icon: <Dumbbell size={20} />, label: "Build strength and stamina" },
    { icon: <Mountain size={20} />, label: "Return to hiking and badminton safely" },
    { icon: <Apple size={20} />, label: "Eat well to support healing and energy" },
];

const REDFLAGS = [
    { icon: <Thermometer size={18} />, label: "Fever > 38°C" },
    { icon: <HeartPulse size={18} />, label: "Increasing abdominal pain" },
    { icon: <Ban size={18} />, label: "Persistent vomiting" },
    { icon: <Salad size={18} />, label: "Unable to eat or drink" },
    { icon: <Footprints size={18} />, label: "Sudden drop in activity level" },
];

export function WallyPlan() {
    return (
        <div className="mx-auto max-w-4xl px-5 py-8">
            <div className="mb-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-attention-soft px-4 py-2 text-[14px] font-semibold text-attention-ink">
                    <ClipboardCheck size={16} /> Goals &amp; Personalised Plan Generated
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-progress-soft px-4 py-2 text-[14px] font-semibold text-progress-ink">
                    <BadgeCheck size={16} /> Verified by your Physiotherapist &amp; Dietitian
                </span>
            </div>

            <article className="overflow-hidden rounded-2xl border border-border bg-surface">
                {/* document header */}
                <header className="border-b border-border px-6 py-5 text-center">
                    <h1 className="text-[26px] font-bold text-ink">Mr Tan&apos;s Recovery Plan</h1>
                    <p className="mt-0.5 text-[14px] text-accent-ink">Laparoscopic Sigmoid Colectomy (Anastomosis)</p>
                    <div className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-1.5 text-[13px] text-ink-muted">
                        <span className="inline-flex items-center gap-1.5"><User size={14} /> Patient: Mr Tan</span>
                        <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} /> Date of Discharge: 25 May 2025</span>
                        <span className="inline-flex items-center gap-1.5"><ClipboardCheck size={14} /> Prepared by: Physiotherapist &amp; Dietitian</span>
                    </div>
                </header>

                {/* goals */}
                <PhaseScope phase="lifestyle">
                    <section className="m-4 rounded-xl bg-accent-soft/50 p-4">
                        <div className="mb-3 flex items-center gap-2 text-accent-ink">
                            <Target size={18} /> <h2 className="text-[14px] font-bold uppercase tracking-wide">Goals</h2>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {GOALS.map((g) => (
                                <div key={g.label} className="flex items-center gap-2.5">
                                    <span className="shrink-0 text-accent-ink">{g.icon}</span>
                                    <span className="text-[13px] text-ink">{g.label}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                </PhaseScope>

                {/* two-column plan */}
                <div className="grid gap-4 px-4 pb-4 lg:grid-cols-2">
                    {/* physiotherapy (blue) */}
                    <PhaseScope phase="onboarding" className="rounded-xl border border-border">
                        <ColumnHeader icon={<Footprints size={18} />} title="Physiotherapy Plan" phase="onboarding" />
                        <div className="space-y-4 p-4">
                            <p className="text-[13px] font-bold uppercase tracking-wide text-accent-ink">Week 1–2 · Early Recovery</p>
                            <Block icon={<Footprints size={18} />} title="Activity">
                                <p>• Walk 3–4 times per day</p>
                                <p>• Aim for 20–30 minutes total each day</p>
                            </Block>
                            <Block icon={<Dumbbell size={18} />} title="Exercises (2× per day)">
                                <p>• Sit-to-stand × 10 reps</p>
                                <p>• Marching on the spot × 1–2 minutes</p>
                                <p>• Gentle stretching (legs, back)</p>
                            </Block>
                            <Block icon={<Wind size={18} />} title="Breathing">
                                <p>• 10 deep breaths every hour while awake</p>
                            </Block>
                            <div className="border-t border-border pt-3">
                                <p className="text-[13px] font-bold uppercase tracking-wide text-accent-ink">Week 3–6 · Progression</p>
                            </div>
                            <Block icon={<Mountain size={18} />} title="Hiking">
                                <p>• Start with short, flat walks</p>
                                <p>• Gradually increase distance &amp; gentle inclines</p>
                                <p>• Goal: 45–60 minutes continuous walking</p>
                            </Block>
                            <Block icon={<Activity size={18} />} title="Badminton">
                                <p>• Week 3–4: light hitting, no lunging</p>
                                <p>• Week 5–6: gradual return to casual play</p>
                            </Block>
                            <Block icon={<Bike size={18} />} title="Gym (Condo Gym)">
                                <p>• Light resistance training, resistance bands</p>
                                <p>• Avoid heavy lifting (&gt;5–7 kg initially)</p>
                            </Block>
                            <Block icon={<Clock size={18} />} title="Exercise Timing">
                                <p>• You prefer exercising at night — great! Keep your evening sessions.</p>
                            </Block>
                        </div>
                    </PhaseScope>

                    {/* dietitian (green) */}
                    <PhaseScope phase="assessment" className="rounded-xl border border-border">
                        <ColumnHeader icon={<Salad size={18} />} title="Dietitian Plan" phase="assessment" />
                        <div className="space-y-4 p-4">
                            <Block icon={<Salad size={18} />} title="Diet Approach">
                                <p>You don&apos;t need a strict soft diet. Return to a normal diet as tolerated — start with smaller, easier-to-digest meals and progress based on how you feel.</p>
                            </Block>
                            <Block icon={<Flame size={18} />} title="Daily Nutrition Targets">
                                <p>• Calories: 1800–2000 kcal/day</p>
                                <p>• Protein: ≥ 80–100 g/day</p>
                            </Block>
                            <Block icon={<Beef size={18} />} title="What to Eat">
                                <p>• Good protein (chicken, fish, eggs, tofu, beans)</p>
                                <p>• Carbs for energy (rice, noodles, bread, oats)</p>
                                <p>• Plenty of vegetables and fruits</p>
                                <p>• Dairy or protein supplements if needed</p>
                            </Block>
                            <Block icon={<Droplets size={18} />} title="Hydration">
                                <p>• Aim for 6–8 glasses of water per day</p>
                                <p>• Drink more if active or sweating</p>
                            </Block>
                            <Block icon={<Carrot size={18} />} title="Go Slow With (initially)">
                                <p>• Very greasy or oily foods</p>
                                <p>• Gas-forming foods (beans, cabbage, broccoli, fizzy drinks) if they cause discomfort</p>
                            </Block>
                        </div>
                    </PhaseScope>
                </div>

                {/* red flags */}
                <section className="m-4 mt-0 rounded-xl border border-critical/30 bg-critical-soft/40 p-4">
                    <div className="mb-3 flex items-center gap-2 text-critical-ink">
                        <TriangleAlert size={18} /> <h2 className="text-[13px] font-bold uppercase tracking-wide">Red Flags — seek medical attention if you have:</h2>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                        {REDFLAGS.map((f) => (
                            <div key={f.label} className="flex items-center gap-2 text-[13px] text-ink">
                                <span className="shrink-0 text-critical">{f.icon}</span> {f.label}
                            </div>
                        ))}
                    </div>
                </section>
            </article>

            <div className="mt-5 flex justify-end">
                <a href="/preview/wally/dashboard">
                    <Button size="lg">Start my recovery <ArrowRight size={18} /></Button>
                </a>
            </div>
        </div>
    );
}
