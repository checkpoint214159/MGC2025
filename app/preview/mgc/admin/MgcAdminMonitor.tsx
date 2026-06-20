"use client";

import { useState } from "react";
import { ShieldAlert, ChevronRight, Phone, Check } from "lucide-react";
import { Card, Chip, Button } from "@/components/ui/primitives";
import { RecoveryProgressChart } from "@/components/recovery/RecoveryProgressChart";
import { cn } from "@/lib/utils";
import type { DayPain } from "@/lib/engagement";

type Patient = {
  id: string;
  name: string;
  surgery: string;
  day: number;
  recoveryDays: number;
  baselinePain: number;
  series: DayPain[];
  flag?: { label: string; window: string };
};

const plateau: DayPain[] = [
  { day: 1, pain: 8 }, { day: 2, pain: 7 }, { day: 3, pain: 7 }, { day: 4, pain: 6 },
  { day: 5, pain: 6 }, { day: 6, pain: 6 }, { day: 7, pain: 6 }, { day: 8, pain: 6 },
];
const improving = (base: number, n: number): DayPain[] =>
  Array.from({ length: n }, (_, i) => ({ day: i + 1, pain: Math.max(0, +(base - i * 0.6).toFixed(1)) }));

const PATIENTS: Patient[] = [
  { id: "1", name: "Margaret Chen", surgery: "Open colectomy", day: 8, recoveryDays: 28, baselinePain: 8, series: plateau, flag: { label: "Pain not decreasing", window: "3 days" } },
  { id: "2", name: "David Okafor", surgery: "Hip replacement", day: 14, recoveryDays: 35, baselinePain: 7, series: improving(7, 14) },
  { id: "3", name: "Sofia Reyes", surgery: "Hernia repair", day: 5, recoveryDays: 14, baselinePain: 5, series: improving(5, 5) },
  { id: "4", name: "Arthur Lim", surgery: "Knee arthroscopy", day: 20, recoveryDays: 30, baselinePain: 6, series: improving(6, 20) },
];

function StatBox({ label, value, tone }: { label: string; value: string; tone?: "attention" | "critical" }) {
  return (
    <Card className="py-4">
      <div className="text-[12px] font-medium uppercase tracking-wide text-ink-subtle">{label}</div>
      <div className={cn("mt-1 text-[26px] font-bold tabular-nums", tone === "critical" ? "text-critical" : tone === "attention" ? "text-attention-ink" : "text-ink")}>{value}</div>
    </Card>
  );
}

export function MgcAdminMonitor() {
  const [selectedId, setSelectedId] = useState("1");
  const [flagStatus, setFlagStatus] = useState<"open" | "escalated" | "dismissed">("open");
  const sorted = [...PATIENTS].sort((a, b) => (b.flag ? 1 : 0) - (a.flag ? 1 : 0));
  const selected = PATIENTS.find((p) => p.id === selectedId)!;
  const openFlags = PATIENTS.filter((p) => p.flag).length - (flagStatus !== "open" ? 1 : 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-5 py-10">
      <header className="space-y-1">
        <h1 className="text-[26px] font-semibold text-ink">Monitoring</h1>
        <p className="text-[15px] text-ink-muted">Patients you manage. Flagged recoveries float to the top.</p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <StatBox label="Patients" value={String(PATIENTS.length)} />
        <StatBox label="Open flags" value={String(Math.max(openFlags, 0))} tone="attention" />
        <StatBox label="Escalated" value={flagStatus === "escalated" ? "1" : "0"} tone="critical" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="overflow-hidden p-0">
          <ul className="divide-y divide-border">
            {sorted.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => setSelectedId(p.id)}
                  className={cn("flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors", p.id === selectedId ? "bg-surface-sunken" : "hover:bg-surface-sunken/60")}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-ink">{p.name}</span>
                      {p.flag && (
                        <Chip tone="critical" size="sm">
                          <ShieldAlert size={12} strokeWidth={2} /> Flag
                        </Chip>
                      )}
                    </div>
                    <div className="text-[13px] text-ink-muted">{p.surgery} · Day {p.day} of {p.recoveryDays}</div>
                  </div>
                  <ChevronRight size={18} strokeWidth={1.75} className="shrink-0 text-ink-subtle" />
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-4">
          <RecoveryProgressChart recoveryDays={selected.recoveryDays} baselinePain={selected.baselinePain} series={selected.series} currentDay={selected.day} />
          {selected.flag ? (
            <Card className="space-y-3 border-critical/20 bg-critical-soft/30">
              <div className="flex items-start gap-2.5">
                <ShieldAlert size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-critical" />
                <div>
                  <h3 className="text-[16px] font-semibold text-ink">{selected.flag.label}</h3>
                  <p className="text-[14px] text-ink-muted">Pain has held at 6/10 for {selected.flag.window}, above the expected curve. Raised automatically by the pain-stagnation rule.</p>
                </div>
              </div>
              {flagStatus === "dismissed" ? (
                <p className="inline-flex items-center gap-1.5 text-[14px] text-progress-ink"><Check size={15} strokeWidth={2.5} /> Flag dismissed.</p>
              ) : flagStatus === "escalated" ? (
                <p className="text-[14px] text-critical-ink">Escalated to the surgeon for review.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => setFlagStatus("escalated")}>Escalate to surgeon</Button>
                  <Button size="sm" variant="secondary"><Phone size={15} strokeWidth={1.75} /> Call patient</Button>
                  <Button size="sm" variant="ghost" onClick={() => setFlagStatus("dismissed")}>Dismiss</Button>
                </div>
              )}
            </Card>
          ) : (
            <Card>
              <p className="text-[14px] text-ink-muted">No flags — {selected.name} is tracking the plan.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
