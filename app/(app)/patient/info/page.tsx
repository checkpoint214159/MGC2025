"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession, SessionProvider } from "next-auth/react";
import { BaseQuestion, BaseQuestionSchema, BaseUserResponse } from "@/lib/llm/schemas/base"; // The Zod schema we built earlier
import { Biometrics, BiometricsSchema } from "@/lib/user/schema";
import { Thread, ThreadSchema } from "@/lib/external/schemas/thread";
import { AssistantMessageSchema, convertMessageToQuestion, convertQuestionToMessage, convertResponseToMessage } from "@/lib/external/schemas/message";
import { SubmitBiometricsPage } from "./BiometricsPage";
import { getInitialLLMQuestion, getNextLLMQuestion } from "@/lib/llm/service";
import { Baseline, BaselineSchema, QueryBaselineSchema } from "@/lib/user/baseline";
import {
  getOnBoardingAction, 
  updateThreadAction, 
  setProfileAction,
  generateUserProfileAction,
  deleteBaselinesAction,
  deleteBiometricsAction,
  deleteOnboardingThreadAction,
  deleteOnboardingDataAction,
} from "@/lib/actions";
import { BaselinePage } from "./BaselinePage";
import { QuestionPage } from "./QuestionPage";
import ForceOnboardingAction from "@/components/development/ForceOnboarding";
import { getQueryBaseline } from "@/lib/user/service";
import { Button } from "@/components/ui/primitives";

export default function OnboardingFlow() {
  const { data: session, status, update } = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();

  const handleReset = async () => {
    console.log('session?.user?.id?', session?.user?.id)
    await queryClient.invalidateQueries({ queryKey: ['onboarding', session?.user?.id] });
    await update({session});
  };

  const { data: onboardingData, isLoading, isError, error } = useQuery({
      queryKey: ['onboarding', session?.user?.id],
      queryFn: async () => {
          const result = await getOnBoardingAction();
          console.log('result from getonboard', result)

          if (!result.success || !result.data) {
            throw new Error(result.error || "Failed to fetch onboarding data");
          }

          const data = result.data

          return {
              biometrics: data.biometrics ? BiometricsSchema.parse(data.biometrics) : null,
              thread: data.activeThread ? ThreadSchema.parse(data.activeThread) : null,
              baseline: data.baseline ? BaselineSchema.parse(data.baseline.data) : null,
              queryBaseline: data.queryBaseline ? QueryBaselineSchema.parse(data.queryBaseline) : null,
          };
      },
      enabled: !!session?.user?.id,
      staleTime: 0,
  });

  const currentStep = useMemo(() => {
    if (isLoading) return "LOADING";
    if (isError) {
      console.log('error??', error)
      return "ERROR"
    };
    if (!onboardingData?.biometrics) return "BIOMETRICS";
    if (!onboardingData?.baseline) return "BASELINES";
    if (!session?.user.doneOnboarding) return "CONVERSATION";
    return "DASHBOARD";
  }, [onboardingData, isLoading, isError]);
  console.log('current onboarding step', currentStep)
  console.log('onboardingData?', onboardingData)
  
  const renderStep = () => {
  switch (currentStep) {
    case "BIOMETRICS":
      return <SubmitBiometricsPage />;
    
    case "BASELINES":
      if (!onboardingData?.biometrics) return null; 

      return (<BaselinePage
        biometrics={onboardingData.biometrics}
        queryBaseline={onboardingData.queryBaseline}/>
      );

    case "CONVERSATION":
      if (!onboardingData?.biometrics || !onboardingData?.baseline) return null; 
    
      return (<QuestionPage
        biometrics={onboardingData.biometrics}
        baseline={onboardingData.baseline}
        thread={onboardingData.thread}
      />)
    }
  }
  console.log('baselines?', onboardingData?.baseline)

  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-6 overflow-hidden pt-20">
    {renderStep()}

    {process.env.NODE_ENV === 'development' && (
      <div className="mt-20 rounded-lg border border-attention/30 bg-attention-soft/40 p-5">
        <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-attention-ink">
          Dev tools
        </h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm"
              onClick={async() => {await deleteBiometricsAction(); await handleReset()}}>
              Delete biometrics
            </Button>
            <Button variant="secondary" size="sm"
              onClick={async () => {await deleteBaselinesAction(); await handleReset()}}>
              Delete baselines
            </Button>
            <Button variant="secondary" size="sm"
              onClick={async () => {await deleteOnboardingThreadAction(); await handleReset()}}>
              Delete thread
            </Button>
            <ForceOnboardingAction />
        </div>
      </div>
    )}
    </div>
  )
}


