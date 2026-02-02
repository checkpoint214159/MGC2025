"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession, SessionProvider } from "next-auth/react";
import { BaseQuestion, BaseQuestionSchema, BaseUserResponse } from "@/lib/llm/schemas/base"; // The Zod schema we built earlier
import { Biometrics, BiometricsSchema } from "@/lib/user/schema";
import { Thread, ThreadSchema } from "@/lib/external/schemas/thread";
import { AssistantMessageSchema, convertMessageToQuestion, convertQuestionToMessage, convertResponseToMessage } from "@/lib/external/schemas/message";
import { SubmitBiometricsPage } from "./BiometricsPage";
import { getInitialLLMQuestion, getNextLLMQuestion } from "@/lib/llm/service";
import { Baselines, BaselinesSchema } from "@/lib/user/baseline";
import {
  getOnBoardingAction, 
  updateThreadAction, 
  setProfileAction,
  generateUserProfileAction,
} from "@/lib/actions";
import { ensureAction } from "@/lib/utils";
import { motion } from "framer-motion";
import { BaselinePage } from "./BaselinePage";
import { QuestionPage } from "./QuestionPage";

export default function OnboardingFlow() {
  const { data: session, status, update } = useSession();

  const [biometrics, setBiometrics] = useState<Biometrics | null>(null);
  const [thread, setThread] = useState<Thread | null>()

  const router = useRouter();

  const { data: onboardingData, isLoading, isError, error } = useQuery({
      queryKey: ['onboarding', session?.user?.id],
      queryFn: async () => {
          if (!session?.user?.id) return null;
          const result = await getOnBoardingAction();
          console.log('result from getonboard', result)

          if (!result.success || !result.data) {
            throw new Error(result.error || "Failed to fetch onboarding data");
          }

          const data = result.data
                
          return {
              biometrics: data.biometrics ? BiometricsSchema.parse(data.biometrics) : null,
              thread: data.activeThread ? ThreadSchema.parse(data.activeThread) : null,
              baselines: data.baselines ? BaselinesSchema.parse(data.baselines.data) : null,
          };
      },
      enabled: !!session?.user?.id,
  });

  const currentStep = useMemo(() => {
    if (isLoading) return "LOADING";
    if (isError) {
      console.log('error??', error)
      return "ERROR"
    };
    if (!onboardingData?.biometrics) return "BIOMETRICS";
    if (!onboardingData?.baselines) return "BASELINES";
    if (!session?.user.doneOnboarding) return "CONVERSATION";
    return "DASHBOARD";
  }, [onboardingData, isLoading, isError]);
  console.log('current onboarding step', currentStep)
  
  const renderStep = () => {
  switch (currentStep) {
    case "BIOMETRICS":
      return <SubmitBiometricsPage />;
    
    case "BASELINES":
      if (!onboardingData?.biometrics) return null; 

      return (<BaselinePage biometrics={onboardingData.biometrics} />);

    case "CONVERSATION":
      if (!onboardingData?.biometrics || !onboardingData?.baselines) return null; 
    
      return (<QuestionPage
        biometrics={onboardingData.biometrics}
        baselines={onboardingData.baselines}
        thread={onboardingData.thread}
      />)
    }
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-[#f8fafc] p-6 overflow-hidden pt-20">
    {renderStep()}
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