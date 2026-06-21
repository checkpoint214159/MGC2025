"use client";

import { ReactNode, useState } from "react";
import { ChevronDown, Pencil } from "lucide-react";
import { Card } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/** A priority card that expands to log today's entry and view/modify recent ones. */
export function ExpandablePriorityCard({
  icon,
  iconClass,
  title,
  summary,
  chip,
  children,
  defaultOpen = false,
}: {
  icon: ReactNode;
  iconClass: string;
  title: string;
  summary: string;
  chip?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="overflow-hidden p-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-surface-sunken/50"
      >
        <div className={cn("grid size-9 shrink-0 place-items-center rounded-md", iconClass)}>{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-ink">{title}</div>
          <div className="text-[13px] text-ink-muted">{summary}</div>
        </div>
        {chip}
        <ChevronDown size={18} strokeWidth={1.75} className={cn("shrink-0 text-ink-subtle transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="space-y-5 border-t border-border p-4">{children}</div>}
    </Card>
  );
}

/** Recent entries list — viewable and (mock) modifiable. */
export function RecentEntries({ entries }: { entries: { day: string; value: string }[] }) {
  return (
    <div>
      <div className="mb-1.5 text-[12px] font-medium uppercase tracking-wide text-ink-subtle">Recent</div>
      <ul className="divide-y divide-border rounded-md border border-border">
        {entries.map((e) => (
          <li key={e.day} className="flex items-center justify-between px-3 py-2.5">
            <span className="text-[14px] text-ink-muted">{e.day}</span>
            <span className="flex items-center gap-2 text-[14px] text-ink">
              {e.value}
              <button type="button" aria-label={`Edit ${e.day}`} className="grid size-8 place-items-center rounded text-ink-subtle hover:bg-surface-sunken hover:text-ink">
                <Pencil size={14} strokeWidth={1.75} />
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
