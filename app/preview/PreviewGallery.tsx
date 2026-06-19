"use client";

/**
 * Dev-only component gallery for the engagement revamp — renders the new components
 * with mock data, bypassing auth/onboarding/LLM. Gated to development by page.tsx.
 */

import { TodayHero } from "@/components/recovery/TodayHero";
import { ReEngagementCheckIn } from "@/components/recovery/ReEngagementCheckIn";
import {
  StreakRing,
  NudgeInline,
  EmptyState,
  CaregiverBanner,
  Card,
} from "@/components/ui/primitives";
import type { Priority, Streak, Nudge } from "@/lib/engagement";

const priorities: Priority[] = [
  {
    id: "1",
    moduleType: "exercise",
    title: "Ankle pumps",
    context: "2 of 3 sets done",
    isComplete: false,
    intensity: "blue",
    href: "/recovery/exercise",
  },
  {
    id: "2",
    moduleType: "nutrition",
    title: "Get your protein in",
    context: "40 / 60 g — for tissue repair",
    isComplete: false,
    href: "/recovery/nutrition",
  },
  {
    id: "3",
    moduleType: "exercise",
    title: "Short hallway walk",
    context: "Today's movement",
    isComplete: true,
    intensity: "orange",
    href: "/recovery/exercise",
  },
];

const streak: Streak = { count: 5, atCap: false, reset: false };
const reviewedBy = { name: "Dr. Aisha Rahman", title: "Lead Physiotherapist" };

const lastOneNudge: Nudge = {
  id: "last-one",
  copy: "Just one thing left today — Get your protein in. It's a quick one.",
  action: { label: "Finish it", href: "/recovery/nutrition" },
};
const eveningNudge: Nudge = {
  id: "evening-open",
  copy: "Evening check — 2 priorities still open. Even one counts.",
};

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-subtle">{label}</h2>
      {children}
    </section>
  );
}

export function PreviewGallery() {
  return (
    <div className="mx-auto max-w-3xl space-y-12 px-5 py-12 md:px-10">
      <header className="space-y-1">
        <div className="inline-flex items-center gap-2 rounded-md bg-attention-soft px-3 py-1.5 text-[12px] text-attention-ink">
          Dev preview — mock data, no backend. Dev-only route (404s in production).
        </div>
        <h1 className="text-[28px] font-semibold text-ink">Engagement revamp — component preview</h1>
      </header>

      <Section label="Today hero — patient mode">
        <TodayHero
          name="Margaret"
          recoveryDay={6}
          phaseLabel="Early recovery"
          priorities={priorities}
          reviewedBy={reviewedBy}
          streak={streak}
        />
      </Section>

      <Section label="Today hero — caregiver mode">
        <CaregiverBanner patientName="Margaret" onExit={() => {}} />
        <TodayHero
          name="Margaret"
          recoveryDay={6}
          phaseLabel="Early recovery"
          priorities={priorities}
          reviewedBy={reviewedBy}
          streak={streak}
          isCaregiver
        />
      </Section>

      <Section label="Streak ring — count progression (one bad day forgiven; solid at cap)">
        <Card className="flex flex-wrap items-center gap-8">
          <StreakRing count={0} atCap={false} />
          <StreakRing count={3} atCap={false} />
          <StreakRing count={5} atCap={false} />
          <StreakRing count={7} atCap />
        </Card>
      </Section>

      <Section label="Context nudges (in-app, at most one)">
        <NudgeInline nudge={lastOneNudge} onDismiss={() => {}} />
        <NudgeInline nudge={eveningNudge} onDismiss={() => {}} />
      </Section>

      <Section label="Day 10–14 re-engagement check-in (dismissible, one-time)">
        <ReEngagementCheckIn day={12} onDismiss={() => {}} />
      </Section>

      <Section label="Empty state">
        <EmptyState
          title="No plan yet"
          body="Your physio is preparing one — check back shortly."
          action={{ label: "Back to today", href: "/" }}
        />
      </Section>
    </div>
  );
}
