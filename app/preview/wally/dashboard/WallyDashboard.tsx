"use client";

import { ReactNode, useState } from "react";
import {
    Bell, Search, MessageCircle, Salad, Activity, Droplets, Moon, Star, CalendarDays,
    Check, Home, ClipboardList, BarChart3, User, ChevronRight,
} from "lucide-react";
import { PhaseScope } from "@/components/wally/PhaseScope";
import { CircularProgress } from "@/components/wally/CircularProgress";
import { FeedbackModal } from "@/components/wally/FeedbackModal";
import { Chip, Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

function SectionCard({ phase, children }: { phase: "onboarding" | "assessment" | "lifestyle"; children: ReactNode }) {
    return (
        <PhaseScope phase={phase}>
            <div className="rounded-2xl border border-border bg-surface p-4">{children}</div>
        </PhaseScope>
    );
}

function CardHead({ icon, title, chip }: { icon: ReactNode; title: string; chip: ReactNode }) {
    return (
        <div className="mb-3 flex items-center gap-2">
            <span className="text-accent-ink">{icon}</span>
            <h3 className="flex-1 text-[16px] font-semibold text-accent-ink">{title}</h3>
            {chip}
        </div>
    );
}

const MEALS = [
    { emoji: "🥗", label: "Breakfast", kcal: 300 },
    { emoji: "🍗", label: "Lunch", kcal: 400 },
    { emoji: "🐟", label: "Dinner", kcal: 300 },
    { emoji: "🥛", label: "Snacks", kcal: 100 },
];

export function WallyDashboard() {
    const [walkDone, setWalkDone] = useState(true);
    const [sitUpsDone, setSitUpsDone] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);

    return (
        <div className="mx-auto max-w-md px-4 py-6">
            {/* header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-[24px] font-bold text-ink">
                        Good morning, <span className="text-accent-ink">Mr Tan</span> 👋
                    </h1>
                    <p className="mt-0.5 text-[14px] text-ink-muted">Let&apos;s keep up the great work today.</p>
                </div>
                <button type="button" aria-label="Notifications" className="relative mt-1 grid size-9 shrink-0 place-items-center rounded-full hover:bg-surface-sunken">
                    <Bell size={20} strokeWidth={1.75} className="text-ink-muted" />
                    <span className="absolute right-1.5 top-1 size-2 rounded-full bg-critical" />
                </button>
            </div>

            {/* search */}
            <div className="mt-4 flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5">
                <Search size={18} className="text-ink-subtle" />
                <span className="flex-1 text-[15px] text-ink-subtle">Ask a question or search…</span>
                <MessageCircle size={18} className="text-accent-ink" />
            </div>

            <div className="mt-4 space-y-3.5">
                {/* daily progress */}
                <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4">
                    <CircularProgress value={68} />
                    <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2 text-accent-ink">
                            <MessageCircle size={18} />
                            <span className="text-[14px] font-semibold">Need help or have a question?</span>
                        </div>
                        <p className="text-[13px] text-ink-muted">Type anything to get personalised advice.</p>
                    </div>
                </div>

                {/* nutrition (green) */}
                <SectionCard phase="assessment">
                    <CardHead icon={<Salad size={18} />} title="Nutrition Tasks" chip={<Chip tone="progress">2 / 2 Completed</Chip>} />
                    <ul className="space-y-1.5">
                        {["Eat 1000 Calories", "Eat 90g Protein"].map((t) => (
                            <li key={t} className="flex items-center gap-2 text-[15px] text-ink">
                                <span className="grid size-5 place-items-center rounded-full bg-accent text-ink-inverse"><Check size={13} strokeWidth={3} /></span>
                                {t}
                            </li>
                        ))}
                    </ul>
                    <div className="mt-3 rounded-xl bg-accent-soft/40 p-3">
                        <p className="mb-2 text-[12px] font-semibold text-accent-ink">Today&apos;s Meal Guide (Example)</p>
                        <div className="flex items-end justify-between gap-1">
                            {MEALS.map((m, i) => (
                                <div key={m.label} className="flex items-center gap-1">
                                    <div className="text-center">
                                        <div className="grid size-11 place-items-center rounded-full bg-surface text-[22px]">{m.emoji}</div>
                                        <div className="mt-1 text-[11px] font-medium text-ink">{m.label}</div>
                                        <div className="text-[10px] text-ink-muted">{m.kcal} kcal</div>
                                    </div>
                                    {i < MEALS.length - 1 && <span className="pb-5 text-ink-subtle">+</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                </SectionCard>

                {/* exercise (blue) */}
                <SectionCard phase="onboarding">
                    <CardHead icon={<Activity size={18} />} title="Exercise Tasks" chip={<Chip tone="accent">{[walkDone, sitUpsDone].filter(Boolean).length} / 2 Completed</Chip>} />
                    <ul className="space-y-2">
                        <li>
                            <button type="button" onClick={() => (walkDone ? setFeedback("walk") : setWalkDone(true))} className="flex w-full items-center gap-2.5 text-left">
                                <span className={cn("grid size-5 shrink-0 place-items-center rounded-md border", walkDone ? "border-accent bg-accent text-ink-inverse" : "border-border-strong")}>
                                    {walkDone && <Check size={13} strokeWidth={3} />}
                                </span>
                                <span className={cn("flex-1 text-[15px]", walkDone ? "text-ink-muted line-through decoration-1" : "text-ink")}>Walk 30 Minutes at Bishan Park</span>
                                <ChevronRight size={16} className="text-ink-subtle" />
                            </button>
                        </li>
                        <li>
                            <button type="button" onClick={() => setSitUpsDone((v) => !v)} className="flex w-full items-center gap-2.5 text-left">
                                <span className={cn("grid size-5 shrink-0 place-items-center rounded-md border", sitUpsDone ? "border-accent bg-accent text-ink-inverse" : "border-border-strong")}>
                                    {sitUpsDone && <Check size={13} strokeWidth={3} />}
                                </span>
                                <span className={cn("flex-1 text-[15px]", sitUpsDone ? "text-ink-muted line-through decoration-1" : "text-ink")}>Do 10 Sit Ups at Fitness Corner</span>
                            </button>
                        </li>
                    </ul>
                    <p className="mt-2 text-[12px] text-ink-subtle">Tip: tap a completed task to log how it went.</p>
                </SectionCard>

                {/* hydration */}
                <div className="rounded-2xl border border-border bg-surface p-4">
                    <div className="mb-3 flex items-center gap-2">
                        <Droplets size={18} className="text-accent-ink" />
                        <h3 className="flex-1 text-[16px] font-semibold text-accent-ink">Hydration</h3>
                        <Chip tone="accent">5 / 8 Glasses</Chip>
                    </div>
                    <div className="flex gap-1.5">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Droplets key={i} size={22} className={i < 5 ? "fill-accent text-accent" : "text-border-strong"} />
                        ))}
                    </div>
                </div>

                {/* sleep */}
                <div className="rounded-2xl border border-border bg-surface p-4">
                    <div className="mb-3 flex items-center gap-2">
                        <Moon size={18} className="text-accent-ink" />
                        <h3 className="flex-1 text-[16px] font-semibold text-accent-ink">Sleep</h3>
                        <Chip tone="accent">7.4 / 8 Hours</Chip>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
                        <div className="h-full rounded-full bg-accent" style={{ width: "92%" }} />
                    </div>
                </div>

                {/* tip (amber) */}
                <PhaseScope phase="lifestyle">
                    <div className="flex items-center gap-3 rounded-2xl border border-accent/20 bg-accent-soft/40 p-4">
                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-ink"><Star size={20} /></span>
                        <div>
                            <h3 className="text-[15px] font-semibold text-ink">Today&apos;s Tip</h3>
                            <p className="text-[13px] text-ink-muted">Short walks improve circulation and support faster recovery.</p>
                        </div>
                    </div>
                </PhaseScope>

                {/* what's next */}
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-ink"><CalendarDays size={20} /></span>
                    <div className="flex-1">
                        <h3 className="text-[15px] font-semibold text-ink">What&apos;s Next</h3>
                        <p className="text-[13px] text-ink-muted">Surgical Review · 28 May 2025 · 10:00 AM</p>
                    </div>
                    <Button size="sm" variant="secondary">View Details</Button>
                </div>
            </div>

            {/* bottom tab bar */}
            <nav className="sticky bottom-3 mt-4 flex items-center justify-around rounded-2xl border border-border bg-surface/95 px-2 py-2 shadow-md backdrop-blur">
                {[
                    { icon: <Home size={20} />, label: "Home", active: true },
                    { icon: <ClipboardList size={20} />, label: "Tasks" },
                    { icon: <BarChart3 size={20} />, label: "Progress" },
                    { icon: <User size={20} />, label: "Profile" },
                ].map((t) => (
                    <span key={t.label} className={cn("flex flex-col items-center gap-0.5 text-[11px] font-medium", t.active ? "text-accent-ink" : "text-ink-subtle")}>
                        {t.icon}
                        {t.label}
                    </span>
                ))}
            </nav>

            {feedback && <FeedbackModal taskName="walk" onClose={() => setFeedback(null)} />}
        </div>
    );
}
