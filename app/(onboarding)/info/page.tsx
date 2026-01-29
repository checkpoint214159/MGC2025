"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, SessionProvider } from "next-auth/react";
import { BaseQuestion, BaseQuestionSchema, BaseUserResponse } from "@/lib/llm/schemas/base"; // The Zod schema we built earlier
import { Biometrics, Baseline, BiometricsSchema } from "@/lib/user/schema";
import { Thread, ThreadSchema } from "@/lib/external/schemas/thread";
import { AssistantMessageSchema, convertMessageToQuestion, convertQuestionToMessage, convertResponseToMessage } from "@/lib/external/schemas/message";
import { BiometricsForm } from "./BiometricsForm"
import { DynamicQuestionCard } from "./QuestionCard"
import { getInitialLLMQuestion, getNextLLMQuestion } from "@/lib/llm/service";
import { 
  updateBiometricsAction, 
  getOnBoardingAction, 
  updateThreadAction, 
  setProfileAction,
  generateUserProfileAction,
} from "@/lib/actions";
import { ensureAction } from "@/lib/utils";

export default function OnboardingFlow() {
  const { data: session, status, update } = useSession();

  const [biometrics, setBiometrics] = useState<Biometrics | null>(null);
  const [thread, setThread] = useState<Thread | null>()
  
  const [currentQuestion, setCurrentQuestion] = useState<BaseQuestion | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const router = useRouter();

  const { data: onboardingData, isLoading: isInitialLoading } = useQuery({
      queryKey: ['onboarding', session?.user?.id],
      queryFn: async () => {
          if (!session?.user?.id) return null;
          const result = await getOnBoardingAction();

          if (!result.success || !result.data) {
            throw new Error(result.error || "Failed to fetch onboarding data");
          }

          const data = result.data
                
          return {
              biometrics: data.biometrics ? BiometricsSchema.parse(data.biometrics) : null,
              thread: data.activeThread ? ThreadSchema.parse(data.activeThread) : null,
          };
      },
      enabled: !!session?.user?.id,
  });

  useEffect(() => {
      if (onboardingData) {
          if (onboardingData.biometrics) setBiometrics(onboardingData.biometrics);
          if (onboardingData.thread) {
              setThread(onboardingData.thread);
              
              // Derive the current question from the thread
              const lastAssistantMsg = [...onboardingData.thread.messages ?? []]
                  .reverse()
                  .find(m => m.role === 'assistant');

              if (lastAssistantMsg) {
                  const validatedMsg = AssistantMessageSchema.parse(lastAssistantMsg);
                  const question = convertMessageToQuestion(validatedMsg);
                  setCurrentQuestion(BaseQuestionSchema.parse(question));
              }
          }
      }
  }, [onboardingData]);

  // TODO: integrate baseline here
  async function submitBio(bio: Biometrics) {
    setBiometrics(bio)
    setIsAiLoading(true)
    
    const userId = session?.user?.id!
    const updatedBioResult = await updateBiometricsAction(bio)
    const updatedBio = ensureAction(updatedBioResult)
    console.log('updatedBio', updatedBio)
    setBiometrics(BiometricsSchema.parse(updatedBio))

    const q1 = await getInitialLLMQuestion(updatedBio) 
    const q1Message = convertQuestionToMessage(q1, thread?.id ?? null, 'onboarding')

    const threadResult = await updateThreadAction({
      threadId: thread?.id ?? null,
      threadType: 'onboarding',
      messages: []
    });

    const newThread = ensureAction(threadResult)

    const updatedResult = await updateThreadAction({
      threadId: newThread?.id ?? null,
      threadType: 'onboarding',
      messages: [q1Message]
    });

    const updated = ensureAction(updatedResult)

    setThread(updated);
    setCurrentQuestion(q1);
    setIsAiLoading(false);
  }

  async function nextQuestion(answer: string) {
    if (!thread || !biometrics || !session?.user?.id) return;
    setIsAiLoading(true)
    
    const userId = session?.user?.id!
    
    const userMsg = convertResponseToMessage(answer, thread.id, 'onboarding')
    const updatedResult = await updateThreadAction({
      threadId: thread.id,
      threadType: 'onboarding',
      messages: [userMsg]
    });
    const updated = ensureAction(updatedResult)
    const nextQn = await getNextLLMQuestion(biometrics, updated) 
    
    // terminate
    if (nextQn.inputType === 'terminateQuestioning') {
      try {
        const profile = await generateUserProfileAction({ thread: updated, biometrics: biometrics });
        await setProfileAction(profile);
        await update(); 
        router.push('/');
        return;
      } catch (e) {
        console.error("Finalization failed", e);
      } finally {
        setIsAiLoading(false);
      }
    }
    
    // here meants the llm did not terminate, so save latest to thread
    const nextMsg = convertQuestionToMessage(nextQn, updated.id, 'onboarding')
    const postLLMResult = await updateThreadAction({
      threadId: updated.id,
      threadType: 'onboarding',
      messages: [nextMsg]
    });
    const postLLM = ensureAction(postLLMResult)
    
    setThread(postLLM)
    setCurrentQuestion(nextQn)
    setIsAiLoading(false);
  }

  if (status === "loading" || isAiLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <h2 className="text-xl font-semibold">
          {status === "loading" ? "Checking Session..." : "Interpreting your response..."}
        </h2>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6">
      {!biometrics || !thread ? (
        <BiometricsForm onComplete={submitBio} />
      ) : (
        <div className="w-full max-w-lg space-y-6">
          {/* Progress / History visualizer */}
          <div className="flex gap-1 justify-center">
            {(thread?.messages ?? [])
              .filter(m => m.role === 'assistant')
              .map((_, i) => (
                <div key={i} className="h-1 w-8 rounded bg-blue-600" />
              ))
            }
          </div>

          <DynamicQuestionCard 
            question={currentQuestion} 
            onAnswer={nextQuestion} 
            loading={isAiLoading} 
          />
        </div>
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

function LoadingOverlay() {
  return (
    <div className="fixed inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center">
       <div className="animate-bounce text-blue-600 font-bold">AI is thinking...</div>
    </div>
  );
}