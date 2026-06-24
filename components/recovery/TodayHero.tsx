"use client";

import { BadgeCheck } from "lucide-react";
import { Card, Chip, StreakRing } from "@/components/ui/primitives";
import { RecoveryArc } from "./RecoveryArc";
import { caregiverCopy, type Streak } from "@/lib/engagement";

type Props = {
    name: string;
    recoveryDay: number | null;
    phaseLabel: string;
    reviewedBy?: { name: string; title: string } | null;
    streak: Streak;
    isCaregiver?: boolean;
};

/**
 * Status-only hero: the day anchor, phase, greeting, streak, and the recovery arc.
 * Logging lives in <DailyLog> directly below — the hero no longer carries the
 * priorities list.
 */
export function TodayHero({
    name,
    recoveryDay,
    phaseLabel,
    reviewedBy,
    streak,
    isCaregiver,
}: Props) {
    const copy = caregiverCopy(!!isCaregiver, name);

    return (
        <Card variant="hero">
            {/* Day anchor + streak — the day is the hero */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4 md:gap-5">
                    {recoveryDay !== null ? (
                        <div className="leading-none">
                            <div className="text-[12px] font-medium uppercase tracking-wide text-ink-subtle">
                                Day
                            </div>
                            <div className="text-[52px] md:text-[60px] font-bold leading-[0.85] tabular-nums text-ink">
                                {recoveryDay}
                            </div>
                        </div>
                    ) : (
                        <div className="text-[28px] font-semibold text-ink">
                            Getting started
                        </div>
                    )}
                    <div className="space-y-1.5 pt-0.5">
                        <Chip tone="accent" size="md">
                            {phaseLabel}
                        </Chip>
                        <h1 className="text-[17px] font-medium text-ink">
                            {isCaregiver
                                ? copy.heading
                                : `${greeting()}, ${name}`}
                        </h1>
                        {reviewedBy && (
                            <p className="flex items-center gap-1.5 text-[14px] text-ink-muted">
                                <BadgeCheck
                                    size={15}
                                    strokeWidth={2}
                                    className="shrink-0 text-progress"
                                />
                                <span>
                                    Reviewed by{" "}
                                    <span className="font-medium text-ink">
                                        {reviewedBy.name}
                                    </span>
                                    , {reviewedBy.title}
                                </span>
                            </p>
                        )}
                    </div>
                </div>

                <div className="shrink-0">
                    <StreakRing count={streak.count} atCap={streak.atCap} />
                </div>
            </div>

            {/* Recovery arc — the signature motif */}
            {recoveryDay !== null && (
                <div className="mt-6 space-y-2.5">
                    <p className="text-[14px] text-ink-muted">
                        Your recovery, one day at a time.
                    </p>
                    <RecoveryArc day={recoveryDay} />
                </div>
            )}
        </Card>
    );
}

function greeting(): string {
    const h = new Date().getHours();
    if (h < 5) return "Resting easy";
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
}
