"use client";

import { ReactNode } from "react";
import { Moon, Salad, Activity, Thermometer, BadgeCheck } from "lucide-react";
import { Card, Chip } from "@/components/ui/primitives";
import { RecoveryProgressChart } from "@/components/recovery/RecoveryProgressChart";
import { TaskFlow } from "@/components/recovery/TaskFlow";
import type { DayPain } from "@/lib/engagement";

// Mock: pain easing then plateauing above plan → "needs attention" + a stagnation story.
const series: DayPain[] = [
  { day: 1, pain: 8 },
  { day: 2, pain: 7 },
  { day: 3, pain: 7 },
  { day: 4, pain: 6 },
  { day: 5, pain: 6 },
  { day: 6, pain: 6 },
  { day: 7, pain: 6 },
  { day: 8, pain: 6 },
];

function PriorityCard({
  icon,
  iconClass,
  title,
  value,
  unit,
  chip,
}: {
  icon: ReactNode;
  iconClass: string;
  title: string;
  value: string;
  unit: string;
  chip: ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-center gap-2.5">
        <div className={`grid size-9 place-items-center rounded-md ${iconClass}`}>{icon}</div>
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-[24px] font-bold tabular-nums text-ink leading-none">{value}</span>
        <span className="text-[13px] text-ink-muted">{unit}</span>
      </div>
      <div className="mt-2">{chip}</div>
    </Card>
  );
}

export function MgcPatientDashboard() {
  return (
      <div className="mx-auto max-w-3xl space-y-6 px-5 py-10 md:px-8">
        <header className="flex items-start gap-4">
          <div className="leading-none">
            <div className="text-[12px] font-medium uppercase tracking-wide text-ink-subtle">Day</div>
            <div className="text-[52px] font-bold leading-[0.85] tabular-nums text-ink">8</div>
          </div>
          <div className="space-y-1.5 pt-0.5">
            <Chip tone="accent" size="md">
              <span className="size-1.5 rounded-full bg-accent" /> Day 8 of 28
            </Chip>
            <h1 className="text-[20px] font-semibold text-ink">Good morning, Margaret.</h1>
            <p className="flex items-center gap-1.5 text-[14px] text-ink-muted">
              <BadgeCheck size={15} strokeWidth={2} className="shrink-0 text-progress" />
              Reviewed by Dr. Aisha Rahman (PT) &amp; Lena Ortiz (Dietician)
            </p>
          </div>
        </header>

        <RecoveryProgressChart recoveryDays={28} baselinePain={8} series={series} currentDay={8} />

        <section className="space-y-3">
          <h2 className="text-[15px] font-semibold text-ink">Your day, four ways</h2>
          <div className="grid grid-cols-2 gap-3">
            <PriorityCard
              icon={<Moon size={18} strokeWidth={1.75} />}
              iconClass="bg-accent-soft text-accent-ink"
              title="Sleep"
              value="6.5"
              unit="of 7 hrs"
              chip={<Chip tone="progress">Fair · on track</Chip>}
            />
            <PriorityCard
              icon={<Salad size={18} strokeWidth={1.75} />}
              iconClass="bg-progress-soft text-progress-ink"
              title="Nutrition"
              value="82"
              unit="of 90g protein"
              chip={<Chip tone="progress">Almost there</Chip>}
            />
            <PriorityCard
              icon={<Activity size={18} strokeWidth={1.75} />}
              iconClass="bg-accent-soft text-accent-ink"
              title="Exercise"
              value="2"
              unit="of 3 done"
              chip={<Chip tone="accent">1 to go</Chip>}
            />
            <PriorityCard
              icon={<Thermometer size={18} strokeWidth={1.75} />}
              iconClass="bg-attention-soft text-attention-ink"
              title="Symptoms"
              value="6"
              unit="/ 10 pain"
              chip={<Chip tone="attention">Holding, not easing</Chip>}
            />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-[15px] font-semibold text-ink">Next up today</h2>
          <TaskFlow
            title="Short hallway walk"
            detail="3 minutes, twice today"
            guidance="Walk at a gentle, steady pace. Keep one hand near a wall or rail. Stop and rest if pain sharpens — that's information, not failure."
            chip={<Chip tone="attention">Cautious</Chip>}
          />
        </section>
      </div>
  );
}
