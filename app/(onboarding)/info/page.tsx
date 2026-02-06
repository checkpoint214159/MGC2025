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
import ForceOnboardingAction from "@/components/admin/ForceOnboarding";
import { getQueryBaseline } from "@/lib/user/service";

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
    <div className="flex flex-col items-center justify-start min-h-screen bg-[#f8fafc] p-6 overflow-hidden pt-20">
    {renderStep()}
    
    {process.env.NODE_ENV === 'development' && (
      <div className="mt-20 p-6 bg-red-50 border-2 border-red-200 rounded-2xl">
        <h3 className="text-red-800 font-bold mb-4 uppercase tracking-wider text-xs">
          Admin / Dev Tools
        </h3>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={async() => {await deleteBiometricsAction(); await handleReset()}}>
              Delete Biometrics
            </button>
            <button
              onClick={async () => {await deleteBaselinesAction(); await handleReset()}}>
              Delete Baselines
            </button>
            <button
              onClick={async () => {await deleteOnboardingThreadAction(); await handleReset()}}>
              Delete Thread
            </button>
            {/* <button
              onClick={async () => {await deleteOnboardingDataAction(); await handleReset()}}>
              Delete All Onboarding
            </button> */}
            <ForceOnboardingAction />
        </div>
      </div>
    )}
    </div>
  )
}


function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
      <h2 className="text-xl font-semibold">{message}</h2>
    </div>
  );
}

function LoadingOverlay() {
  return (
    <div className="fixed inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center">
       <div className="animate-bounce text-blue-600 font-bold">AI is thinking...</div>
    </div>
  );
}