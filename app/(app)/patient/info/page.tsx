"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { getOnboardingStateAction } from "@/lib/actions";
import { SubmitBiometricsPage } from "./BiometricsPage";
import { BaselinePage } from "./BaselinePage";
import { QuestionPage } from "./QuestionPage";
import { QueryBaselineSchema } from "@/lib/user/baseline";

export default function OnboardingFlow() {
  const { data: session } = useSession();
  const router = useRouter();

  const { data: onboardingState, isLoading } = useQuery({
    queryKey: ["onboarding-state", session?.user?.id],
    queryFn: async () => {
      const result = await getOnboardingStateAction();
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    enabled: !!session?.user?.id,
    staleTime: 0,
  });

  // Session flag is the fastest "done" signal — no need to wait for the query
  if (session?.user?.doneOnboarding) {
    router.push("/");
    return null;
  }

  if (isLoading || !onboardingState) {
    return <LoadingScreen message="Loading..." />;
  }

  if (onboardingState.phase === "complete") {
    router.push("/");
    return null;
  }

  if (onboardingState.phase === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-red-600">
        <p className="font-semibold">Something went wrong</p>
        <p className="text-sm mt-1">{onboardingState.message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-[#f8fafc] p-6 overflow-hidden pt-20">
      {onboardingState.phase === "biometrics" && <SubmitBiometricsPage />}

      {onboardingState.phase === "collect_baseline_responses" && (
        <BaselinePage queryBaseline={QueryBaselineSchema.parse(onboardingState.queryBaseline)} />
      )}

      {onboardingState.phase === "answer_question" && (
        <QuestionPage
          question={onboardingState.question}
          questionCount={onboardingState.questionCount}
          thread={onboardingState.thread ?? null}
        />
      )}
    </div>
  );
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
      <h2 className="text-xl font-semibold">{message}</h2>
    </div>
  );
}
