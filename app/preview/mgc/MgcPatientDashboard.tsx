"use client";

import { useState } from "react";
import { Moon, Salad, Activity, Thermometer, BadgeCheck, Check } from "lucide-react";
import { Chip, Button } from "@/components/ui/primitives";
import { DailyPlant } from "@/components/recovery/DailyPlant";
import { ExpandablePriorityCard, RecentEntries } from "@/components/recovery/ExpandablePriorityCard";
import { cn } from "@/lib/utils";

const inputClass = "h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-[16px] text-ink";

type Tasks = { sleep: boolean; protein: boolean; ex1: boolean; ex2: boolean; ex3: boolean; symptoms: boolean };

function TodayLabel() {
  return <div className="text-[12px] font-medium uppercase tracking-wide text-ink-subtle">Today</div>;
}

export function MgcPatientDashboard() {
  const [tasks, setTasks] = useState<Tasks>({ sleep: true, protein: true, ex1: true, ex2: false, ex3: false, symptoms: false });
  const [pain, setPain] = useState(6);
  const total = Object.keys(tasks).length;
  const done = Object.values(tasks).filter(Boolean).length;
  const setTask = (k: keyof Tasks, v = true) => setTasks((t) => ({ ...t, [k]: v }));
  const toggle = (k: keyof Tasks) => setTasks((t) => ({ ...t, [k]: !t[k] }));

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

      {/* Today's progress — a growing plant */}
      <DailyPlant done={done} total={total} />

      <section className="space-y-3">
        <h2 className="text-[15px] font-semibold text-ink">Your day — tap to log</h2>

        {/* Sleep */}
        <ExpandablePriorityCard
          icon={<Moon size={18} strokeWidth={1.75} />}
          iconClass="bg-accent-soft text-accent-ink"
          title="Sleep"
          summary={tasks.sleep ? "6.5 of 7 hrs · Fair" : "Not logged yet"}
          chip={<Chip tone={tasks.sleep ? "progress" : "neutral"}>{tasks.sleep ? "Logged" : "To do"}</Chip>}
        >
          <div className="space-y-2">
            <TodayLabel />
            {tasks.sleep ? (
              <p className="inline-flex items-center gap-1.5 text-[14px] text-progress-ink"><Check size={15} strokeWidth={2.5} /> 6.5 hrs · Fair</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input type="number" defaultValue={6.5} step={0.5} className={cn(inputClass, "w-24")} aria-label="Hours slept" />
                  <span className="text-[14px] text-ink-muted">hours</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {["Poor", "Fair", "Good", "Excellent"].map((q, i) => (
                    <button key={q} className={cn("rounded-full border px-3 py-1 text-[13px]", i === 1 ? "border-accent bg-accent-soft text-accent-ink" : "border-border text-ink-muted hover:bg-surface-sunken")}>{q}</button>
                  ))}
                </div>
                <Button size="sm" onClick={() => setTask("sleep")}>Save sleep</Button>
              </div>
            )}
          </div>
          <RecentEntries entries={[{ day: "Yesterday", value: "6.5h · Fair" }, { day: "2 days ago", value: "6h · Poor" }, { day: "3 days ago", value: "7h · Good" }]} />
        </ExpandablePriorityCard>

        {/* Nutrition */}
        <ExpandablePriorityCard
          icon={<Salad size={18} strokeWidth={1.75} />}
          iconClass="bg-progress-soft text-progress-ink"
          title="Nutrition"
          summary={tasks.protein ? "82 of 90g protein · 1.6L water" : "Not logged yet"}
          chip={<Chip tone={tasks.protein ? "progress" : "neutral"}>{tasks.protein ? "Logged" : "To do"}</Chip>}
        >
          <div className="space-y-2">
            <TodayLabel />
            {tasks.protein ? (
              <p className="inline-flex items-center gap-1.5 text-[14px] text-progress-ink"><Check size={15} strokeWidth={2.5} /> 82g protein · 1.6L water</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[13px] text-ink-muted">Protein (g)</label><input type="number" defaultValue={82} className={inputClass} /></div>
                <div><label className="text-[13px] text-ink-muted">Water (L)</label><input type="number" defaultValue={1.6} step={0.1} className={inputClass} /></div>
                <Button size="sm" className="col-span-2 w-fit" onClick={() => setTask("protein")}>Save nutrition</Button>
              </div>
            )}
          </div>
          <RecentEntries entries={[{ day: "Yesterday", value: "88g · 2.0L" }, { day: "2 days ago", value: "75g · 1.4L" }]} />
        </ExpandablePriorityCard>

        {/* Exercise */}
        <ExpandablePriorityCard
          icon={<Activity size={18} strokeWidth={1.75} />}
          iconClass="bg-accent-soft text-accent-ink"
          title="Exercise"
          summary={`${[tasks.ex1, tasks.ex2, tasks.ex3].filter(Boolean).length} of 3 movements done`}
          chip={<Chip tone={tasks.ex1 && tasks.ex2 && tasks.ex3 ? "progress" : "accent"}>{tasks.ex1 && tasks.ex2 && tasks.ex3 ? "Done" : "In progress"}</Chip>}
        >
          <div className="space-y-2">
            <TodayLabel />
            <div className="space-y-2">
              {([
                { k: "ex1" as const, name: "Ankle pumps", detail: "3 sets of 10", chip: "Easy" },
                { k: "ex2" as const, name: "Short hallway walk", detail: "3 min, twice", chip: "Cautious" },
                { k: "ex3" as const, name: "Seated knee extensions", detail: "2 sets of 8", chip: "Easy" },
              ]).map((m) => (
                <button key={m.k} type="button" onClick={() => toggle(m.k)} className="flex w-full items-center gap-3 rounded-md border border-border px-3 py-2.5 text-left hover:bg-surface-sunken/60">
                  <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border", tasks[m.k] ? "border-progress bg-progress text-ink-inverse" : "border-border-strong")}>
                    {tasks[m.k] && <Check size={14} strokeWidth={2.5} />}
                  </span>
                  <div className="flex-1">
                    <div className={cn("text-[15px] font-medium text-ink", tasks[m.k] && "line-through decoration-1")}>{m.name}</div>
                    <div className="text-[13px] text-ink-muted">{m.detail}</div>
                  </div>
                  <Chip tone={m.chip === "Cautious" ? "attention" : "accent"} size="sm">{m.chip}</Chip>
                </button>
              ))}
            </div>
          </div>
          <RecentEntries entries={[{ day: "Yesterday", value: "3 of 3" }, { day: "2 days ago", value: "2 of 3" }]} />
        </ExpandablePriorityCard>

        {/* Symptoms */}
        <ExpandablePriorityCard
          icon={<Thermometer size={18} strokeWidth={1.75} />}
          iconClass="bg-attention-soft text-attention-ink"
          title="Symptoms"
          summary={tasks.symptoms ? `Pain ${pain}/10 · holding` : "Not logged yet"}
          chip={<Chip tone={tasks.symptoms ? "attention" : "neutral"}>{tasks.symptoms ? "Logged" : "To do"}</Chip>}
        >
          <div className="space-y-3">
            <TodayLabel />
            <div className="flex items-center justify-between">
              <span className="text-[15px] text-ink">Pain right now</span>
              <span className="text-[24px] font-semibold tabular-nums text-attention-ink">{pain}<span className="text-[14px] text-ink-muted"> / 10</span></span>
            </div>
            <input type="range" min={0} max={10} value={pain} onChange={(e) => setPain(Number(e.target.value))} aria-label="Pain right now" className="h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-sunken accent-[var(--attention)]" />
            {!tasks.symptoms && <Button size="sm" onClick={() => setTask("symptoms")}>Save symptoms</Button>}
            {tasks.symptoms && <p className="inline-flex items-center gap-1.5 text-[14px] text-progress-ink"><Check size={15} strokeWidth={2.5} /> Logged. We&apos;ll keep an eye on it.</p>}
          </div>
          <RecentEntries entries={[{ day: "Yesterday", value: "Pain 6/10" }, { day: "2 days ago", value: "Pain 6/10" }, { day: "3 days ago", value: "Pain 7/10" }]} />
        </ExpandablePriorityCard>
      </section>
    </div>
  );
}
