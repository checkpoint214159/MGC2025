"use client";

import Link from "next/link";
import { BadgeCheck, Check, ChevronRight, Sparkles } from "lucide-react";
import { Card, Chip, StreakRing } from "@/components/ui/primitives";
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
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone="accent" size="md">
              <span className="size-1.5 rounded-full bg-accent" />
              {recoveryDay !== null ? `Day ${recoveryDay}` : "Getting started"}
            </Chip>
            <Chip tone="neutral" size="md">{phaseLabel}</Chip>
          </div>
          <h1 className="text-[28px] md:text-[32px] font-semibold text-ink leading-tight">
            {isCaregiver ? `${copy.heading}.` : `${greeting()}, ${name}.`}
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

        <div className="rounded-md bg-surface-sunken px-4 py-3">
          <StreakRing count={streak.count} atCap={streak.atCap} />
        </div>
      </div>

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
