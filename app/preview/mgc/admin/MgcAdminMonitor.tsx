"use client";

import { useState } from "react";
import {
    ShieldAlert,
    AlertTriangle,
    CheckCircle2,
    ChevronRight,
    Phone,
    Check,
    CalendarCheck,
} from "lucide-react";
import { Card, Chip, Button } from "@/components/ui/primitives";
import { RecoveryProgressChart } from "@/components/recovery/RecoveryProgressChart";
import { cn } from "@/lib/utils";
import {
    evaluateRecoveryFlags,
    maxSeverity,
    type DayPain,
    type DayProgress,
    type RecoveryFlag,
    type FlagSeverity,
} from "@/lib/engagement";

type Patient = {
    id: string;
    name: string;
    surgery: string;
    day: number;
    recoveryDays: number;
    baselinePain: number;
    pain: DayPain[];
    progress: DayProgress[];
};

// ── mock series ──────────────────────────────────────────────────────────────
const plateau: DayPain[] = [
    { day: 1, pain: 8 },
    { day: 2, pain: 7 },
    { day: 3, pain: 7 },
    { day: 4, pain: 6 },
    { day: 5, pain: 6 },
    { day: 6, pain: 6 },
    { day: 7, pain: 6 },
    { day: 8, pain: 6 },
];
const improvingPain = (base: number, n: number): DayPain[] =>
    Array.from({ length: n }, (_, i) => ({
        day: i + 1,
        pain: Math.max(0, +(base - i * 0.6).toFixed(1)),
    }));
const climbTo = (end: number, n: number): DayProgress[] =>
    Array.from({ length: n }, (_, i) => ({
        day: i + 1,
        progress: Math.round((end * (i + 1)) / n),
    }));
const fromList = (vals: number[]): DayProgress[] =>
    vals.map((progress, i) => ({ day: i + 1, progress }));

const PATIENTS: Patient[] = [
    // pain plateau → pain-stagnation flag (critical)
    {
        id: "1",
        name: "Margaret Chen",
        surgery: "Open colectomy",
        day: 8,
        recoveryDays: 28,
        baselinePain: 8,
        pain: plateau,
        progress: climbTo(30, 8),
    },
    // progress falling two days running → dropping flag (critical)
    {
        id: "2",
        name: "Tomás Vega",
        surgery: "Spinal fusion",
        day: 12,
        recoveryDays: 30,
        baselinePain: 7,
        pain: improvingPain(7, 12),
        progress: fromList([5, 11, 17, 23, 29, 35, 41, 46, 49, 50, 48, 45]),
    },
    // a week with no real gain → stalled flag (attention)
    {
        id: "3",
        name: "Priya Nair",
        surgery: "Hysterectomy",
        day: 16,
        recoveryDays: 28,
        baselinePain: 6,
        pain: improvingPain(6, 16),
        progress: fromList([
            6, 12, 19, 26, 33, 40, 46, 51, 55, 55, 56, 55, 56, 55, 56, 56,
        ]),
    },
    // ~93% done → nearing-completion flag (info / final review)
    {
        id: "4",
        name: "Arthur Lim",
        surgery: "Knee arthroscopy",
        day: 27,
        recoveryDays: 30,
        baselinePain: 6,
        pain: improvingPain(6, 27),
        progress: climbTo(93, 27),
    },
    // healthy climbers → no flags
    {
        id: "5",
        name: "David Okafor",
        surgery: "Hip replacement",
        day: 14,
        recoveryDays: 35,
        baselinePain: 7,
        pain: improvingPain(7, 14),
        progress: climbTo(42, 14),
    },
    {
        id: "6",
        name: "Sofia Reyes",
        surgery: "Hernia repair",
        day: 5,
        recoveryDays: 14,
        baselinePain: 5,
        pain: improvingPain(5, 5),
        progress: climbTo(38, 5),
    },
];

const flagsFor = (p: Patient) =>
    evaluateRecoveryFlags({ progress: p.progress, pain: p.pain });

// ── per-severity presentation ────────────────────────────────────────────────
const SEV = {
    critical: {
        chip: "critical" as const,
        icon: ShieldAlert,
        card: "border-critical/25 bg-critical-soft/30",
        text: "text-critical",
    },
    attention: {
        chip: "attention" as const,
        icon: AlertTriangle,
        card: "border-attention/25 bg-attention-soft/30",
        text: "text-attention-ink",
    },
    info: {
        chip: "accent" as const,
        icon: CheckCircle2,
        card: "border-accent/25 bg-accent-soft/30",
        text: "text-accent-ink",
    },
} satisfies Record<
    FlagSeverity,
    {
        chip: "critical" | "attention" | "accent";
        icon: typeof ShieldAlert;
        card: string;
        text: string;
    }
>;

function StatBox({
    label,
    value,
    tone,
}: {
    label: string;
    value: string;
    tone?: "attention" | "critical";
}) {
    return (
        <Card className="py-4">
            <div className="text-[12px] font-medium uppercase tracking-wide text-ink-subtle">
                {label}
            </div>
            <div
                className={cn(
                    "mt-1 text-[26px] font-bold tabular-nums",
                    tone === "critical"
                        ? "text-critical"
                        : tone === "attention"
                          ? "text-attention-ink"
                          : "text-ink",
                )}
            >
                {value}
            </div>
        </Card>
    );
}

function FlagCard({ flag, patient }: { flag: RecoveryFlag; patient: string }) {
    const [status, setStatus] = useState<"open" | "actioned" | "dismissed">(
        "open",
    );
    const sev = SEV[flag.severity];
    const Icon = sev.icon;
    const positive = flag.severity === "info";
    const actionedMsg =
        flag.kind === "nearing_completion"
            ? "Final review scheduled with the specialist."
            : flag.kind === "progress_stalled"
              ? "Message sent — checking in on blockers."
              : "Escalated to the surgeon for review.";

    return (
        <Card className={cn("space-y-3", sev.card)}>
            <div className="flex items-start gap-2.5">
                <Icon
                    size={18}
                    strokeWidth={1.75}
                    className={cn("mt-0.5 shrink-0", sev.text)}
                />
                <div>
                    <h3 className="text-[16px] font-semibold text-ink">
                        {flag.title}
                    </h3>
                    <p className="text-[14px] text-ink-muted">
                        {flag.detail}{" "}
                        <span className="text-ink-subtle">
                            Raised automatically.
                        </span>
                    </p>
                </div>
            </div>
            {status === "dismissed" ? (
                <p className="inline-flex items-center gap-1.5 text-[14px] text-ink-muted">
                    <Check size={15} strokeWidth={2.5} /> Flag dismissed.
                </p>
            ) : status === "actioned" ? (
                <p
                    className={cn(
                        "inline-flex items-center gap-1.5 text-[14px]",
                        positive ? "text-progress-ink" : "text-critical-ink",
                    )}
                >
                    {positive ? (
                        <CalendarCheck size={15} strokeWidth={2} />
                    ) : (
                        <Check size={15} strokeWidth={2.5} />
                    )}{" "}
                    {actionedMsg}
                </p>
            ) : (
                <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setStatus("actioned")}>
                        {flag.action}
                    </Button>
                    {!positive && (
                        <Button size="sm" variant="secondary">
                            <Phone size={15} strokeWidth={1.75} /> Call{" "}
                            {patient.split(" ")[0]}
                        </Button>
                    )}
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setStatus("dismissed")}
                    >
                        Dismiss
                    </Button>
                </div>
            )}
        </Card>
    );
}

export function MgcAdminMonitor() {
    const [selectedId, setSelectedId] = useState("1");

    const withFlags = PATIENTS.map((p) => ({ ...p, flags: flagsFor(p) }));
    const sorted = [...withFlags].sort(
        (a, b) => maxSeverity(b.flags) - maxSeverity(a.flags),
    );
    const selected = withFlags.find((p) => p.id === selectedId)!;

    const totalFlags = withFlags.reduce((n, p) => n + p.flags.length, 0);
    const urgent = withFlags.reduce(
        (n, p) => n + p.flags.filter((f) => f.severity === "critical").length,
        0,
    );

    return (
        <div className="mx-auto max-w-5xl space-y-6 px-5 py-10">
            <header className="space-y-1">
                <h1 className="text-[26px] font-semibold text-ink">
                    Monitoring
                </h1>
                <p className="text-[15px] text-ink-muted">
                    Patients you manage. Flagged recoveries float to the top.
                </p>
            </header>

            <div className="grid grid-cols-3 gap-3">
                <StatBox label="Patients" value={String(PATIENTS.length)} />
                <StatBox
                    label="Open flags"
                    value={String(totalFlags)}
                    tone="attention"
                />
                <StatBox
                    label="Urgent"
                    value={String(urgent)}
                    tone="critical"
                />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="overflow-hidden p-0">
                    <ul className="divide-y divide-border">
                        {sorted.map((p) => {
                            const top = p.flags[0];
                            return (
                                <li key={p.id}>
                                    <button
                                        onClick={() => setSelectedId(p.id)}
                                        className={cn(
                                            "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors",
                                            p.id === selectedId
                                                ? "bg-surface-sunken"
                                                : "hover:bg-surface-sunken/60",
                                        )}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-medium text-ink">
                                                    {p.name}
                                                </span>
                                                {top && (
                                                    <Chip
                                                        tone={
                                                            SEV[top.severity]
                                                                .chip
                                                        }
                                                        size="sm"
                                                    >
                                                        {top.title}
                                                        {p.flags.length > 1
                                                            ? ` +${
                                                                  p.flags
                                                                      .length -
                                                                  1
                                                              }`
                                                            : ""}
                                                    </Chip>
                                                )}
                                            </div>
                                            <div className="text-[13px] text-ink-muted">
                                                {p.surgery} · Day {p.day} of{" "}
                                                {p.recoveryDays}
                                            </div>
                                        </div>
                                        <ChevronRight
                                            size={18}
                                            strokeWidth={1.75}
                                            className="shrink-0 text-ink-subtle"
                                        />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </Card>

                <div className="space-y-4">
                    <RecoveryProgressChart
                        recoveryDays={selected.recoveryDays}
                        baselinePain={selected.baselinePain}
                        series={selected.pain}
                        currentDay={selected.day}
                    />
                    {selected.flags.length === 0 ? (
                        <Card>
                            <p className="text-[14px] text-ink-muted">
                                No flags — {selected.name} is tracking the plan.
                            </p>
                        </Card>
                    ) : (
                        selected.flags.map((f) => (
                            <FlagCard
                                key={`${selected.id}-${f.kind}`}
                                flag={f}
                                patient={selected.name}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
