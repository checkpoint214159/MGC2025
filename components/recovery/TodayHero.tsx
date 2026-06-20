"use client";

import Link from "next/link";
import { BadgeCheck, Check, ChevronRight, Sparkles } from "lucide-react";
import { Card, Chip, StreakRing } from "@/components/ui/primitives";
import { RecoveryArc } from "./RecoveryArc";
import { caregiverCopy, type Priority, type Streak } from "@/lib/engagement";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  recoveryDay: number | null;
  phaseLabel: string;
  priorities: Priority[];
  reviewedBy?: { name: string; title: string } | null;
  streak: Streak;
  isCaregiver?: boolean;
};

export function TodayHero({ name, recoveryDay, phaseLabel, priorities, reviewedBy, streak, isCaregiver }: Props) {
  const allDone = priorities.length > 0 && priorities.every((p) => p.isComplete);
  const copy = caregiverCopy(!!isCaregiver, name);

  return (
    <Card variant="hero" className="mb-6">
      {/* Day anchor + streak — the day is the hero */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4 md:gap-5">
          {recoveryDay !== null ? (
            <div className="leading-none">
              <div className="text-[12px] font-medium uppercase tracking-wide text-ink-subtle">Day</div>
              <div className="text-[52px] md:text-[60px] font-bold leading-[0.85] tabular-nums text-ink">
                {recoveryDay}
              </div>
            </div>
          ) : (
            <div className="text-[28px] font-semibold text-ink">Getting started</div>
          )}
          <div className="space-y-1.5 pt-0.5">
            <Chip tone="accent" size="md">{phaseLabel}</Chip>
            <h1 className="text-[17px] font-medium text-ink">
              {isCaregiver ? copy.heading : `${greeting()}, ${name}`}
            </h1>
            {reviewedBy && (
              <p className="flex items-center gap-1.5 text-[14px] text-ink-muted">
                <BadgeCheck size={15} strokeWidth={2} className="shrink-0 text-progress" />
                <span>
                  Reviewed by <span className="font-medium text-ink">{reviewedBy.name}</span>, {reviewedBy.title}
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
          <p className="text-[14px] text-ink-muted">Your recovery, one day at a time.</p>
          <RecoveryArc day={recoveryDay} />
        </div>
      )}

      <div className="my-6 h-px bg-border" />

      {/* Priorities */}
      <div className="space-y-1">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-[15px] font-semibold text-ink">
            {allDone
              ? isCaregiver
                ? "All three done — nicely."
                : "All three priorities done — nicely."
              : isCaregiver
                ? `${name}'s 3 priorities today`
                : "Your 3 priorities today"}
          </h2>
          {allDone && <Sparkles size={16} className="text-progress" strokeWidth={1.75} />}
        </div>

        {priorities.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-surface-sunken/40 p-5 text-[14px] text-ink-muted">
            No active plan yet. Your physio is preparing one — check back shortly.
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border bg-surface overflow-hidden">
            {priorities.map((p) => (
              <PriorityRow key={p.id} item={p} />
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function PriorityRow({ item }: { item: Priority }) {
  return (
    <li>
      <Link
        href={item.href}
        className={cn(
          "group flex items-center gap-4 px-4 py-3.5 transition-colors",
          "hover:bg-surface-sunken/60"
        )}
      >
        <div
          className={cn(
            "size-7 rounded-full grid place-items-center shrink-0 border",
            item.isComplete
              ? "bg-progress text-ink-inverse border-progress"
              : "bg-surface border-border-strong text-ink-subtle"
          )}
          aria-hidden
        >
          {item.isComplete && <Check size={15} strokeWidth={2.5} />}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className={cn(
              "text-[15px] font-medium text-ink leading-snug",
              item.isComplete && "text-ink-muted line-through decoration-1"
            )}
          >
            {item.title}
          </div>
          <div className="text-[13px] text-ink-muted leading-snug">{item.context}</div>
        </div>
        {item.intensity && (
          <Chip
            size="sm"
            tone={item.intensity === "red" ? "critical" : item.intensity === "orange" ? "attention" : "accent"}
          >
            {item.intensity === "red" ? "Pause if pain" : item.intensity === "orange" ? "Cautious" : "Easy"}
          </Chip>
        )}
        <ChevronRight
          size={18}
          className="text-ink-subtle group-hover:text-ink transition-colors shrink-0"
          strokeWidth={1.75}
        />
      </Link>
    </li>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Resting easy";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
