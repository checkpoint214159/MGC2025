"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { fetchStateAction, getOnBoardingAction } from "@/lib/actions";
import { ensureAction } from "@/lib/utils";
import { useAppDate } from "@/context/DateContext";
import { useCaregiver } from "@/context/CaregiverContext";
import { useLocalStorageFlag } from "@/lib/hooks/useLocalStorageFlag";
import DashboardRenderer from "@/components/recovery/DashboardRenderer";
import { TodayHero } from "@/components/recovery/TodayHero";
import { ReEngagementCheckIn } from "@/components/recovery/ReEngagementCheckIn";
import { NudgeInline, CaregiverBanner } from "@/components/ui/primitives";
import { DevDateSwitcher } from "@/components/development/DevDateSwitcher";
import ForceGenerateButton from "@/components/development/ForceStateGeneration";
import ForceOnboardingAction from "@/components/development/ForceOnboarding";
import { FLAGS } from "@/lib/config/flags";
import { MOCK_REVIEWED_BY, MOCK_STREAK_HISTORY } from "@/lib/mock/engagement";
import {
  getRecoveryDay,
  getRecoveryPhase,
  getPhaseLabel,
  getTopPriorities,
  getStreak,
  selectNudge,
} from "@/lib/engagement";

export function UserDashboard() {
  const { normalizedDate, isSimulated, isToday } = useAppDate();
  const { data: session, status } = useSession();
  const { isCaregiver, patientName, exit: exitCaregiver } = useCaregiver();
  const [checkInDismissed, dismissCheckIn] = useLocalStorageFlag("reEngagementDismissed");

  const stateQuery = useQuery({
    queryKey: ["recoveryState", session?.user?.id, normalizedDate.toISOString()],
    queryFn: async () => ensureAction(await fetchStateAction(normalizedDate)),
    enabled: status === "authenticated" && !!session?.user?.id,
    staleTime: 1000 * 60 * 5,
  });

  const onboarding = useQuery({
    queryKey: ["onboarding", session?.user?.id],
    queryFn: async () => ensureAction(await getOnBoardingAction()),
    enabled: status === "authenticated" && !!session?.user?.id,
    staleTime: 1000 * 60 * 10,
  });

  if (status === "loading" || stateQuery.isLoading) {
    return <DashboardSkeleton />;
  }

  const state = stateQuery.data ?? null;
  const surgeryDate = onboarding.data?.biometrics?.surgeryDate
    ? new Date(onboarding.data.biometrics.surgeryDate)
    : null;
  const recoveryDay = getRecoveryDay({ surgeryDate, today: normalizedDate });
  const phase = getRecoveryPhase(recoveryDay);
  const phaseLabel = getPhaseLabel(phase);
  const priorities = getTopPriorities(state, 3);
  const streak = getStreak(MOCK_STREAK_HISTORY); // mock history this pass (see spec follow-ups)
  const nudge = selectNudge(priorities, { hour: new Date().getHours() });
  const reviewedBy = FLAGS.reviewedBy ? MOCK_REVIEWED_BY : null;

  const name = session?.user?.name?.split(" ")[0] || "there";
  const caregiverActive = FLAGS.caregiverMode && isCaregiver;

  return (
    <div className="px-5 md:px-10 lg:px-12 py-8 md:py-12 max-w-5xl mx-auto pb-24">
      {isSimulated && (
        <div className="mb-4 rounded-md bg-attention-soft text-attention-ink text-[13px] px-3 py-2 inline-flex items-center gap-2">
          Simulated date: {normalizedDate.toLocaleDateString("en-US", {
            weekday: "long", month: "long", day: "numeric",
          })}
        </div>
      )}

      {caregiverActive && (
        <CaregiverBanner patientName={patientName || name} onExit={exitCaregiver} />
      )}

      <TodayHero
        name={caregiverActive ? patientName || name : name}
        recoveryDay={recoveryDay}
        phaseLabel={phaseLabel}
        priorities={priorities}
        reviewedBy={reviewedBy}
        streak={streak}
        isCaregiver={caregiverActive}
      />

      {nudge && !caregiverActive && <NudgeInline nudge={nudge} />}

      {phase === "re-engagement" && !checkInDismissed && !caregiverActive && (
        <ReEngagementCheckIn day={recoveryDay} onDismiss={dismissCheckIn} />
      )}

      <section className="mt-2">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-[15px] font-semibold text-ink">Full plan for today</h2>
          {isToday && (
            <span className="text-[12px] text-ink-subtle">
              Updated {new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </span>
          )}
        </div>
        <DashboardRenderer config={state} />
      </section>

      {process.env.NODE_ENV === "development" && (
        <div className="mt-12 rounded-lg border border-attention/40 bg-attention-soft/30 p-5">
          <h3 className="text-[12px] uppercase tracking-wide text-attention-ink font-semibold mb-3">
            Dev tools
          </h3>
          <div className="flex flex-wrap gap-3">
            <DevDateSwitcher />
            <ForceGenerateButton normalizedDate={normalizedDate} />
            <ForceOnboardingAction />
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="px-5 md:px-10 lg:px-12 py-8 md:py-12 max-w-5xl mx-auto">
      <div className="rounded-xl border border-border bg-surface p-8 mb-6 space-y-4">
        <div className="h-3 w-32 rounded bg-surface-sunken" />
        <div className="h-8 w-2/3 rounded bg-surface-sunken" />
        <div className="space-y-2 pt-3">
          <div className="h-14 rounded bg-surface-sunken" />
          <div className="h-14 rounded bg-surface-sunken" />
          <div className="h-14 rounded bg-surface-sunken" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-44 rounded-lg border border-border bg-surface" />
        <div className="h-44 rounded-lg border border-border bg-surface" />
      </div>
    </div>
  );
}
