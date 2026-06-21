"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { fetchStateAction } from "@/lib/actions";
import { ensureAction, getModuleFromState } from "@/lib/utils";
import { useAppDate } from "@/context/DateContext";
import RecoveryExerciseRenderer from "./ExerciseWidget";
import { EmptyState } from "@/components/ui/primitives";
import { ExerciseModule, ExercisePlan } from "@/lib/state/schemas/exercise";

export default function ExercisePage() {
  const { data: session, status } = useSession();
  const { normalizedDate } = useAppDate();

  const { data: state, isLoading } = useQuery({
    queryKey: ["recoveryState", session?.user?.id, normalizedDate.toISOString()],
    queryFn: async () => ensureAction(await fetchStateAction(normalizedDate)),
    enabled: status === "authenticated" && !!session?.user?.id,
    staleTime: 1000 * 60 * 5,
  });

  if (!session) {
    return <FallbackMessage message="Sign in to view your exercise plan." />;
  }
  if (isLoading) {
    return <PageSkeleton />;
  }

  const exerciseModule: ExerciseModule | null = getModuleFromState(state, "exercise");
  if (!exerciseModule?.progress || !exerciseModule.plan) {
    return <FallbackMessage message="Your exercise plan hasn't been generated yet." />;
  }

  const { progress, plan, id: moduleId } = exerciseModule;

  return (
    <div className="px-5 md:px-10 lg:px-12 py-8 md:py-12 max-w-5xl mx-auto pb-24">
      <PageHeader
        title="Exercise"
        subtitle={exerciseModule.summary ?? "Movements scaled to where you are in recovery."}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        {plan.map((part: ExercisePlan) => {
          const trackable = progress.trackables.find((t) => t.id === part.id);
          if (!trackable) return null;
          return (
            <RecoveryExerciseRenderer
              key={part.id}
              plan={part}
              trackable={trackable}
              moduleId={moduleId}
            />
          );
        })}
      </div>
    </div>
  );
}

function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="space-y-3">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink transition-colors"
      >
        <ArrowLeft size={15} strokeWidth={1.75} /> Back to today
      </Link>
      <h1 className="text-[28px] md:text-[32px] font-semibold text-ink leading-tight">{title}</h1>
      {subtitle && <p className="text-[15px] text-ink-muted max-w-prose">{subtitle}</p>}
    </header>
  );
}

function PageSkeleton() {
  return (
    <div className="px-5 md:px-10 lg:px-12 py-8 md:py-12 max-w-5xl mx-auto">
      <div className="space-y-3">
        <div className="h-3 w-24 rounded bg-surface-sunken" />
        <div className="h-8 w-1/3 rounded bg-surface-sunken" />
        <div className="h-4 w-2/3 rounded bg-surface-sunken" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        <div className="h-72 rounded-lg border border-border bg-surface" />
        <div className="h-72 rounded-lg border border-border bg-surface" />
      </div>
    </div>
  );
}

function FallbackMessage({ message }: { message: string }) {
  return (
    <div className="px-5 md:px-10 lg:px-12 py-12 max-w-5xl mx-auto">
      <EmptyState title="No plan yet" body={message} action={{ label: "Back to today", href: "/" }} />
    </div>
  );
}
