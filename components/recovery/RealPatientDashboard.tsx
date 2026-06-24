"use client";

import { Suspense } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { fetchStateAction, fetchRecoveryHistoryAction } from "@/lib/actions";
import { ensureAction } from "@/lib/utils";
import { useAppDate } from "@/context/DateContext";
import { buildDashboardVM } from "@/lib/engagement/adapter";
import { TodayHero } from "@/components/recovery/TodayHero";
import { RecoveryProgressChart } from "@/components/recovery/RecoveryProgressChart";
import { CareTeamCard } from "@/components/recovery/CareTeamCard";
import { DailyLog } from "@/components/recovery/DailyLog";
import { DevDateSwitcher } from "@/components/development/DevDateSwitcher";
import ForceGenerateButton from "@/components/development/ForceStateGeneration";
import ForceOnboardingAction from "@/components/development/ForceOnboarding";

/**
 * The live patient dashboard. One coherent surface: a status hero, the single
 * inline logging accordion (<DailyLog>), the progress chart fed by real pain, and
 * the care-team safety net. Order is task-first — log, then reflect on the chart.
 */
export function RealPatientDashboard() {
    const { normalizedDate, isSimulated } = useAppDate();
    const { data: session, status } = useSession();
    const userId = session?.user?.id;
    const enabled = status === "authenticated" && !!userId;

    const { data: today, isLoading: todayLoading } = useQuery({
        queryKey: ["recoveryState", userId, normalizedDate],
        queryFn: async () =>
            ensureAction(await fetchStateAction(normalizedDate)),
        enabled,
        staleTime: 1000 * 60 * 5,
    });

    const { data: history } = useQuery({
        queryKey: ["recoveryHistory", userId],
        queryFn: async () => ensureAction(await fetchRecoveryHistoryAction()),
        enabled,
        staleTime: 1000 * 60 * 5,
    });

    if (status === "loading" || todayLoading) {
        return <DashboardSkeleton />;
    }

    const vm = buildDashboardVM({
        today,
        history: history?.states ?? [],
        surgeryDate: history?.surgeryDate
            ? new Date(history.surgeryDate)
            : null,
    });

    return (
        <div className="mx-auto max-w-3xl space-y-6 px-5 py-10 md:px-8">
            {isSimulated && (
                <p className="text-[13px] font-medium text-attention-ink">
                    Simulated date —{" "}
                    {normalizedDate.toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                    })}
                </p>
            )}

            <TodayHero
                name={session?.user?.name ?? "there"}
                recoveryDay={vm.recoveryDay}
                phaseLabel={vm.phaseLabel}
                streak={vm.streak}
                reviewedBy={null}
            />

            {today ? (
                <Suspense fallback={null}>
                    <DailyLog state={today} />
                </Suspense>
            ) : (
                <div className="rounded-lg border border-dashed border-border bg-surface-sunken/40 p-8 text-center text-[14px] text-ink-muted">
                    No recovery plan for this date yet.
                </div>
            )}

            {vm.arc && (
                <RecoveryProgressChart
                    recoveryDays={vm.arc.recoveryDays}
                    baselinePain={vm.arc.baselinePain}
                    series={vm.arc.series}
                    currentDay={vm.arc.currentDay}
                />
            )}

            <CareTeamCard />

            {process.env.NODE_ENV === "development" && (
                <div className="mt-10 rounded-2xl border border-border bg-surface-sunken/40 p-6">
                    <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-subtle">
                        Admin / Dev Tools
                    </h3>
                    <div className="flex flex-wrap gap-4">
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
        <div
            className="mx-auto max-w-3xl space-y-6 px-5 py-10 md:px-8"
            aria-busy="true"
            aria-label="Loading your day"
        >
            <div className="rounded-xl border border-border bg-surface p-7 md:p-8">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-12 rounded bg-surface-sunken" />
                        <div className="space-y-2">
                            <div className="h-5 w-28 rounded-full bg-surface-sunken" />
                            <div className="h-4 w-40 rounded bg-surface-sunken" />
                        </div>
                    </div>
                    <div className="size-[76px] rounded-full bg-surface-sunken" />
                </div>
                <div className="mt-6 h-14 rounded bg-surface-sunken" />
            </div>
            <div className="space-y-3">
                <div className="h-4 w-24 rounded bg-surface-sunken" />
                <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="flex items-center gap-3 p-4">
                            <div className="size-9 rounded-md bg-surface-sunken" />
                            <div className="flex-1 space-y-1.5">
                                <div className="h-4 w-40 rounded bg-surface-sunken" />
                                <div className="h-3 w-24 rounded bg-surface-sunken" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
