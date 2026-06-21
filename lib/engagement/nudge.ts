import type { Priority } from "./index";

export type Nudge = {
  id: string;
  copy: string;
  action?: { label: string; href: string };
};

export type NudgeContext = { hour: number };

const EVENING_HOUR = 17;

/**
 * Picks AT MOST ONE in-app, context-appropriate nudge from current priorities and
 * time of day. Non-clinical encouragement only. Returns null when nothing fits —
 * no nudge is better than a generic one.
 */
export function selectNudge(priorities: Priority[], ctx: NudgeContext): Nudge | null {
  if (priorities.length === 0) return null;
  const open = priorities.filter((pr) => !pr.isComplete);
  if (open.length === 0) return null;

  if (open.length === 1) {
    const only = open[0];
    return {
      id: "last-one",
      copy: `Just one thing left today — ${only.title}. It's a quick one.`,
      action: { label: "Finish it", href: only.href },
    };
  }

  if (ctx.hour >= EVENING_HOUR) {
    return {
      id: "evening-open",
      copy: `Evening check — ${open.length} priorities still open. Even one counts.`,
    };
  }

  return null;
}
