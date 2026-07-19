"use client";

import { ReactNode, useState } from "react";
import {
    Bell,
    Search,
    MessageCircle,
    Salad,
    Activity,
    Droplets,
    Moon,
    Star,
    CalendarDays,
    Check,
    Home,
    ClipboardList,
    BarChart3,
    User,
    ChevronRight,
    ChevronDown,
    Plus,
    Flame,
    Beef,
    X,
    Sparkles,
    LifeBuoy,
} from "lucide-react";
import { PhaseScope } from "@/components/wally/PhaseScope";
import { DailyPlant } from "@/components/recovery/DailyPlant";
import { FeedbackModal } from "@/components/wally/FeedbackModal";
import { SupportTab } from "@/components/wally/SupportTab";
import { FoodIcon, SG_DISHES, type DishId } from "@/components/wally/FoodIcons";
import { Chip, Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const KCAL_TARGET = 1800; // dietitian plan: 1800–2000 kcal/day
const PROTEIN_TARGET = 90; // dietitian plan: ≥ 80–100 g/day

function SectionCard({
    phase,
    children,
}: {
    phase: "onboarding" | "assessment" | "lifestyle";
    children: ReactNode;
}) {
    return (
        <PhaseScope phase={phase}>
            <div className="rounded-2xl border border-border bg-surface p-4">
                {children}
            </div>
        </PhaseScope>
    );
}

function CardHead({
    icon,
    title,
    chip,
}: {
    icon: ReactNode;
    title: string;
    chip: ReactNode;
}) {
    return (
        <div className="mb-3 flex items-center gap-2">
            <span className="text-accent-ink">{icon}</span>
            <h3 className="flex-1 text-[16px] font-semibold text-accent-ink">
                {title}
            </h3>
            {chip}
        </div>
    );
}

const URINE = [
    { label: "Pale", color: "oklch(0.95 0.05 100)" },
    { label: "Normal", color: "oklch(0.86 0.13 92)" },
    { label: "Dark", color: "oklch(0.6 0.13 70)" },
];
const DISRUPTIONS = ["Pain", "Bathroom trips", "Discomfort", "Anxiety"];

function Pill({
    label,
    active,
    onClick,
}: {
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
                active
                    ? "border-accent bg-accent-soft text-accent-ink"
                    : "border-border text-ink-muted hover:bg-surface-sunken",
            )}
        >
            {label}
        </button>
    );
}

function MacroBar({
    icon,
    label,
    value,
    target,
    unit,
}: {
    icon: ReactNode;
    label: string;
    value: number;
    target: number;
    unit: string;
}) {
    const pct = Math.min((value / target) * 100, 100);
    return (
        <div>
            <div className="flex items-baseline justify-between">
                <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink">
                    <span className="text-accent-ink">{icon}</span> {label}
                </span>
                <span className="text-[13px] tabular-nums text-ink">
                    {Math.round(value)}{" "}
                    <span className="text-ink-muted">
                        / {target} {unit}
                    </span>
                </span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
                <div
                    className="h-full rounded-full bg-accent transition-[width] duration-300"
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

/** Interactive nutrition — log Singapore hawker meals against the dietitian's targets. */
function NutritionCard({
    logged,
    onAdd,
    onRemove,
}: {
    logged: DishId[];
    onAdd: (d: DishId) => void;
    onRemove: (i: number) => void;
}) {
    const [showAll, setShowAll] = useState(false);
    const dishes = logged.map((id) => SG_DISHES.find((d) => d.id === id)!);
    const kcal = dishes.reduce((s, d) => s + d.kcal, 0);
    const protein = dishes.reduce((s, d) => s + d.protein, 0);
    const kcalLeft = Math.max(0, KCAL_TARGET - kcal);
    const proteinLeft = Math.max(0, PROTEIN_TARGET - protein);

    // Wally's localised suggestion: prioritise closing the protein gap gently
    const suggested: DishId[] =
        proteinLeft >= 30
            ? ["fishSoup", "kwayChap"]
            : kcalLeft >= 450
              ? ["meeSoto", "chickenRice"]
              : [];
    const suggestion =
        proteinLeft <= 0 && kcalLeft <= 0
            ? "Targets met — beautifully fuelled today."
            : proteinLeft >= 30
              ? `About ${proteinLeft}g protein to go — sliced fish soup or kway chap would close it nicely.`
              : kcalLeft >= 450
                ? `Roughly ${kcalLeft} kcal left today — mee soto or chicken rice fits well.`
                : "Nearly there — a light snack will do it.";

    const sorted = [...SG_DISHES].sort(
        (a, b) =>
            (suggested.includes(b.id) ? 1 : 0) -
            (suggested.includes(a.id) ? 1 : 0),
    );
    const visible = showAll ? sorted : sorted.slice(0, 4);

    return (
        <SectionCard phase="assessment">
            <CardHead
                icon={<Salad size={18} />}
                title="Nutrition"
                chip={
                    <Chip
                        tone={
                            kcal >= KCAL_TARGET && protein >= PROTEIN_TARGET
                                ? "progress"
                                : "accent"
                        }
                    >
                        {kcal} / {KCAL_TARGET} kcal
                    </Chip>
                }
            />

            <div className="space-y-2.5">
                <MacroBar
                    icon={<Flame size={14} />}
                    label="Calories"
                    value={kcal}
                    target={KCAL_TARGET}
                    unit="kcal"
                />
                <MacroBar
                    icon={<Beef size={14} />}
                    label="Protein"
                    value={protein}
                    target={PROTEIN_TARGET}
                    unit="g"
                />
            </div>

            {/* today's logged meals */}
            {dishes.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                    {dishes.map((d, i) => (
                        <li
                            key={`${d.id}-${i}`}
                            className="flex items-center gap-2.5 rounded-xl bg-accent-soft/30 p-1.5 pr-2"
                        >
                            <FoodIcon dish={d.id} size={38} />
                            <div className="min-w-0 flex-1 leading-tight">
                                <div className="truncate text-[14px] font-medium text-ink">
                                    {d.name}
                                </div>
                                <div className="text-[12px] text-ink-muted">
                                    {d.kcal} kcal · {d.protein}g protein
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => onRemove(i)}
                                aria-label={`Remove ${d.name}`}
                                className="grid size-8 shrink-0 place-items-center rounded-full text-ink-subtle hover:bg-surface-sunken hover:text-ink"
                            >
                                <X size={15} strokeWidth={2} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {/* Wally's suggestion */}
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-accent-soft/40 p-3">
                <Sparkles
                    size={15}
                    className="mt-0.5 shrink-0 text-accent-ink"
                />
                <p className="text-[13px] leading-snug text-accent-ink">
                    {suggestion}
                </p>
            </div>

            {/* add a meal — SG favourites */}
            <p className="mb-2 mt-3 text-[12px] font-semibold uppercase tracking-wide text-accent-ink">
                Log a meal · Singapore favourites
            </p>
            <div className="grid grid-cols-2 gap-2">
                {visible.map((d) => {
                    const isSuggested = suggested.includes(d.id);
                    return (
                        <button
                            key={d.id}
                            type="button"
                            onClick={() => onAdd(d.id)}
                            className={cn(
                                "flex items-center gap-2 rounded-xl border p-2 text-left transition-colors hover:bg-surface-sunken/60",
                                isSuggested
                                    ? "border-accent bg-accent-soft/30"
                                    : "border-border",
                            )}
                        >
                            <FoodIcon dish={d.id} size={42} />
                            <div className="min-w-0 flex-1 leading-tight">
                                {isSuggested && (
                                    <div className="text-[10px] font-bold uppercase tracking-wide text-accent-ink">
                                        Wally suggests
                                    </div>
                                )}
                                <div className="truncate text-[13px] font-medium text-ink">
                                    {d.name}
                                </div>
                                <div className="text-[11.5px] text-ink-muted">
                                    {d.kcal} kcal · {d.protein}g
                                </div>
                            </div>
                            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-ink-inverse">
                                <Plus size={13} strokeWidth={2.5} />
                            </span>
                        </button>
                    );
                })}
            </div>
            <button
                type="button"
                onClick={() => setShowAll((s) => !s)}
                className="mt-2 w-full rounded-lg py-1.5 text-[13px] font-medium text-accent-ink hover:bg-surface-sunken"
            >
                {showAll
                    ? "Show fewer dishes"
                    : `Show all ${SG_DISHES.length} dishes`}
            </button>
            <p className="mt-1.5 text-[11px] leading-snug text-ink-subtle">
                Per-serving estimates · singaporecalorie.com &amp;
                healthscreening.sg
            </p>
        </SectionCard>
    );
}

export function WallyDashboard() {
    const [tab, setTab] = useState<"home" | "support">("home");
    const [walkDone, setWalkDone] = useState(true);
    const [sitUpsDone, setSitUpsDone] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    // nutrition log (starts with breakfast logged)
    const [logged, setLogged] = useState<DishId[]>(["beeHoon"]);
    const dishes = logged.map((id) => SG_DISHES.find((d) => d.id === id)!);
    const kcal = dishes.reduce((s, d) => s + d.kcal, 0);
    const protein = dishes.reduce((s, d) => s + d.protein, 0);
    // light tap-to-log state
    const [hydrationOpen, setHydrationOpen] = useState(false);
    const [glasses, setGlasses] = useState(5);
    const [urine, setUrine] = useState("Normal");
    const [sleepOpen, setSleepOpen] = useState(false);
    const [quality, setQuality] = useState("Good");
    const [disruptions, setDisruptions] = useState<string[]>(["Pain"]);
    const toggleDisruption = (d: string) =>
        setDisruptions((s) =>
            s.includes(d) ? s.filter((x) => x !== d) : [...s, d],
        );

    // today's tasks → the growing plant
    const total = 6;
    const done =
        (kcal >= KCAL_TARGET ? 1 : 0) +
        (protein >= PROTEIN_TARGET ? 1 : 0) +
        (walkDone ? 1 : 0) +
        (sitUpsDone ? 1 : 0) +
        (glasses >= 8 ? 1 : 0) +
        1; // sleep logged

    return (
        <div className="mx-auto max-w-md px-4 py-6">
            {/* header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-[24px] font-bold text-ink">
                        Good morning,{" "}
                        <span className="text-accent-ink">Mr Tan</span> 👋
                    </h1>
                    <p className="mt-0.5 text-[14px] text-ink-muted">
                        Let&apos;s keep up the great work today.
                    </p>
                </div>
                <button
                    type="button"
                    aria-label="Notifications"
                    className="relative mt-1 grid size-9 shrink-0 place-items-center rounded-full hover:bg-surface-sunken"
                >
                    <Bell
                        size={20}
                        strokeWidth={1.75}
                        className="text-ink-muted"
                    />
                    <span className="absolute right-1.5 top-1 size-2 rounded-full bg-critical" />
                </button>
            </div>

            {/* search */}
            <div className="mt-4 flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5">
                <Search size={18} className="text-ink-subtle" />
                <span className="flex-1 text-[15px] text-ink-subtle">
                    Ask a question or search…
                </span>
                <MessageCircle size={18} className="text-accent-ink" />
            </div>

            {tab === "support" ? (
                <div className="mt-4">
                    <SupportTab />
                </div>
            ) : (
                <div className="mt-4 space-y-3.5">
                    {/* daily progress — a growing plant for today's tasks */}
                    <DailyPlant done={done} total={total} />

                    {/* nutrition (green) — interactive SG meal log */}
                    <NutritionCard
                        logged={logged}
                        onAdd={(d) => setLogged((l) => [...l, d])}
                        onRemove={(i) =>
                            setLogged((l) => l.filter((_, idx) => idx !== i))
                        }
                    />

                    {/* exercise (blue) */}
                    <SectionCard phase="onboarding">
                        <CardHead
                            icon={<Activity size={18} />}
                            title="Exercise Tasks"
                            chip={
                                <Chip tone="accent">
                                    {
                                        [walkDone, sitUpsDone].filter(Boolean)
                                            .length
                                    }{" "}
                                    / 2 Completed
                                </Chip>
                            }
                        />
                        <ul className="space-y-2">
                            <li>
                                <button
                                    type="button"
                                    onClick={() =>
                                        walkDone
                                            ? setFeedback("walk")
                                            : setWalkDone(true)
                                    }
                                    className="flex w-full items-center gap-2.5 text-left"
                                >
                                    <span
                                        className={cn(
                                            "grid size-5 shrink-0 place-items-center rounded-md border",
                                            walkDone
                                                ? "border-accent bg-accent text-ink-inverse"
                                                : "border-border-strong",
                                        )}
                                    >
                                        {walkDone && (
                                            <Check size={13} strokeWidth={3} />
                                        )}
                                    </span>
                                    <span
                                        className={cn(
                                            "flex-1 text-[15px]",
                                            walkDone
                                                ? "text-ink-muted line-through decoration-1"
                                                : "text-ink",
                                        )}
                                    >
                                        Walk 30 Minutes at Bishan Park
                                    </span>
                                    <ChevronRight
                                        size={16}
                                        className="text-ink-subtle"
                                    />
                                </button>
                            </li>
                            <li>
                                <button
                                    type="button"
                                    onClick={() => setSitUpsDone((v) => !v)}
                                    className="flex w-full items-center gap-2.5 text-left"
                                >
                                    <span
                                        className={cn(
                                            "grid size-5 shrink-0 place-items-center rounded-md border",
                                            sitUpsDone
                                                ? "border-accent bg-accent text-ink-inverse"
                                                : "border-border-strong",
                                        )}
                                    >
                                        {sitUpsDone && (
                                            <Check size={13} strokeWidth={3} />
                                        )}
                                    </span>
                                    <span
                                        className={cn(
                                            "flex-1 text-[15px]",
                                            sitUpsDone
                                                ? "text-ink-muted line-through decoration-1"
                                                : "text-ink",
                                        )}
                                    >
                                        Do 10 Sit Ups at Fitness Corner
                                    </span>
                                </button>
                            </li>
                        </ul>
                        <p className="mt-2 text-[12px] text-ink-subtle">
                            Tip: tap a completed task to log how it went.
                        </p>
                    </SectionCard>

                    {/* hydration — tap to log */}
                    <div className="rounded-2xl border border-border bg-surface p-4">
                        <button
                            type="button"
                            onClick={() => setHydrationOpen((o) => !o)}
                            className="flex w-full items-center gap-2"
                        >
                            <Droplets size={18} className="text-accent-ink" />
                            <h3 className="flex-1 text-left text-[16px] font-semibold text-accent-ink">
                                Hydration
                            </h3>
                            <Chip tone="accent">{glasses} / 8 Glasses</Chip>
                            <ChevronDown
                                size={18}
                                className={cn(
                                    "text-ink-subtle transition-transform",
                                    hydrationOpen && "rotate-180",
                                )}
                            />
                        </button>
                        <div className="mt-3 flex gap-1.5">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <Droplets
                                    key={i}
                                    size={22}
                                    className={
                                        i < glasses
                                            ? "fill-accent text-accent"
                                            : "text-border-strong"
                                    }
                                />
                            ))}
                        </div>
                        {hydrationOpen && (
                            <div className="mt-4 space-y-4 border-t border-border pt-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[14px] text-ink">
                                        Just drank a glass?
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() =>
                                            setGlasses((g) =>
                                                Math.min(8, g + 1),
                                            )
                                        }
                                    >
                                        <Plus size={15} strokeWidth={2} /> Add a
                                        glass
                                    </Button>
                                </div>
                                <div>
                                    <p className="mb-1.5 text-[13px] font-medium text-ink">
                                        Urine colour{" "}
                                        <span className="font-normal text-ink-subtle">
                                            — a quick hydration check
                                        </span>
                                    </p>
                                    <div className="flex gap-2">
                                        {URINE.map((u) => (
                                            <button
                                                key={u.label}
                                                type="button"
                                                onClick={() =>
                                                    setUrine(u.label)
                                                }
                                                className={cn(
                                                    "flex flex-1 flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[12px] font-medium transition-colors",
                                                    urine === u.label
                                                        ? "border-accent bg-accent-soft/40 text-accent-ink"
                                                        : "border-border text-ink-muted hover:bg-surface-sunken",
                                                )}
                                            >
                                                <span
                                                    className="size-6 rounded-full border border-border-strong"
                                                    style={{
                                                        background: u.color,
                                                    }}
                                                />
                                                {u.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* sleep — tap to log */}
                    <div className="rounded-2xl border border-border bg-surface p-4">
                        <button
                            type="button"
                            onClick={() => setSleepOpen((o) => !o)}
                            className="flex w-full items-center gap-2"
                        >
                            <Moon size={18} className="text-accent-ink" />
                            <h3 className="flex-1 text-left text-[16px] font-semibold text-accent-ink">
                                Sleep
                            </h3>
                            <Chip tone="accent">7.4 / 8 Hours</Chip>
                            <ChevronDown
                                size={18}
                                className={cn(
                                    "text-ink-subtle transition-transform",
                                    sleepOpen && "rotate-180",
                                )}
                            />
                        </button>
                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
                            <div
                                className="h-full rounded-full bg-accent"
                                style={{ width: "92%" }}
                            />
                        </div>
                        {sleepOpen && (
                            <div className="mt-4 space-y-4 border-t border-border pt-4">
                                <div>
                                    <p className="mb-1.5 text-[13px] font-medium text-ink">
                                        How was your sleep?
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {[
                                            "Poor",
                                            "Fair",
                                            "Good",
                                            "Excellent",
                                        ].map((q) => (
                                            <Pill
                                                key={q}
                                                label={q}
                                                active={quality === q}
                                                onClick={() => setQuality(q)}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="mb-1.5 text-[13px] font-medium text-ink">
                                        Anything wake you?{" "}
                                        <span className="font-normal text-ink-subtle">
                                            (optional)
                                        </span>
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {DISRUPTIONS.map((d) => (
                                            <Pill
                                                key={d}
                                                label={d}
                                                active={disruptions.includes(d)}
                                                onClick={() =>
                                                    toggleDisruption(d)
                                                }
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* tip (amber) */}
                    <PhaseScope phase="lifestyle">
                        <div className="flex items-center gap-3 rounded-2xl border border-accent/20 bg-accent-soft/40 p-4">
                            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-ink">
                                <Star size={20} />
                            </span>
                            <div>
                                <h3 className="text-[15px] font-semibold text-ink">
                                    Today&apos;s Tip
                                </h3>
                                <p className="text-[13px] text-ink-muted">
                                    Short walks improve circulation and support
                                    faster recovery.
                                </p>
                            </div>
                        </div>
                    </PhaseScope>

                    {/* what's next */}
                    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-ink">
                            <CalendarDays size={20} />
                        </span>
                        <div className="flex-1">
                            <h3 className="text-[15px] font-semibold text-ink">
                                What&apos;s Next
                            </h3>
                            <p className="text-[13px] text-ink-muted">
                                Surgical Review · 28 May 2025 · 10:00 AM
                            </p>
                        </div>
                        <Button size="sm" variant="secondary">
                            View Details
                        </Button>
                    </div>
                </div>
            )}

            {/* bottom tab bar */}
            <nav className="sticky bottom-3 mt-4 flex items-center justify-around rounded-2xl border border-border bg-surface/95 px-2 py-2 shadow-md backdrop-blur">
                {[
                    {
                        icon: <Home size={20} />,
                        label: "Home",
                        onClick: () => setTab("home"),
                        active: tab === "home",
                    },
                    { icon: <ClipboardList size={20} />, label: "Tasks" },
                    {
                        icon: <BarChart3 size={20} />,
                        label: "Progress",
                        onClick: () =>
                            window.location.assign("/preview/wally/report"),
                    },
                    {
                        icon: <LifeBuoy size={20} />,
                        label: "Support",
                        onClick: () => setTab("support"),
                        active: tab === "support",
                    },
                    { icon: <User size={20} />, label: "Profile" },
                ].map((t) => (
                    <button
                        key={t.label}
                        type="button"
                        onClick={t.onClick}
                        className={cn(
                            "flex flex-col items-center gap-0.5 rounded-lg px-2 py-0.5 text-[11px] font-medium",
                            t.active ? "text-accent-ink" : "text-ink-subtle",
                            t.onClick
                                ? "hover:bg-surface-sunken"
                                : "cursor-default",
                        )}
                    >
                        {t.icon}
                        {t.label}
                    </button>
                ))}
            </nav>

            {feedback && (
                <FeedbackModal
                    taskName="walk"
                    onClose={() => setFeedback(null)}
                />
            )}
        </div>
    );
}
