"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession, SessionProvider } from "next-auth/react";
import { BaseQuestion, BaseQuestionSchema, BaseUserResponse } from "@/lib/llm/schemas/base"; // The Zod schema we built earlier
import { Biometrics, Baseline, BiometricsSchema } from "@/lib/profile/schema";
import { Thread, ThreadSchema } from "@/lib/external/schemas/thread";
import { AssistantMessageSchema, convertMessageToQuestion, convertQuestionToMessage, convertResponseToMessage } from "@/lib/external/schemas/message";
import { BiometricsForm } from "./BiometricsForm"
import { DynamicQuestionCard } from "./QuestionCard"
import { getInitialLLMQuestion, getNextLLMQuestion } from "@/lib/llm/service";
import { 
  updateBiometricsAction, 
  getOnBoardingAction, 
  updateThreadAction 
} from "@/lib/actions";


export default function OnboardingFlow() {
  const { data: session, status, update } = useSession();

  const [biometrics, setBiometrics] = useState<Biometrics | null>(null);
  const [thread, setThread] = useState<Thread | null>()
  
  const [currentQuestion, setCurrentQuestion] = useState<BaseQuestion | null>(null);

  const [isInitializing, setIsInitializing] = useState(true);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const router = useRouter();

  const loadPersistedData = useCallback(async () => {
    if (!session?.user?.id) return;

    const data = await getOnBoardingAction(session.user.id);
    console.log('data??', data)
    
    if (data.biometrics) {
      setBiometrics(BiometricsSchema.parse(data.biometrics));
    }
    
    if (data.activeThread) {
      const validThread  = ThreadSchema.parse(data.activeThread)
      setThread(validThread)

      const lastAssistantMsg = [...validThread.messages ?? []]
        .reverse()
        .find(m => m.role === 'assistant');

      const validatedAssistantMsg = AssistantMessageSchema.parse(lastAssistantMsg)
      const question = convertMessageToQuestion(validatedAssistantMsg)
      console.log('question?', question)
      const validatedQuestion = BaseQuestionSchema.parse(question)
      console.log('validatedQuestion', validatedQuestion)
      setCurrentQuestion(validatedQuestion)
    }

  }, [session?.user?.id]);

  if (status === "unauthenticated") {
    router.push("/login");
    return;
  }

  useEffect(() => {
    if (status === "authenticated") {
      loadPersistedData();
    }
  }, [status, loadPersistedData]);

  
  useEffect(() => {
    const generateProfile = async () => {
      if (currentQuestion?.inputType === 'terminateQuestioning') {
        try {
          await generateUserProfile(session?.user?.id!, thread);

          router.push('/')
        } catch (error) {
          console.error("Finalization failed:", error);
        }
      }
    }

    generateProfile()
  }, [currentQuestion, thread, session, router])

  // TODO: integrate baseline here
  async function submitBio(bio: Biometrics) {
    setBiometrics(bio)
    setIsAiLoading(true)
    
    const userId = session?.user?.id!
    const updatedBio = await updateBiometricsAction(userId, bio)
    setBiometrics(BiometricsSchema.parse(updatedBio))

    const q1 = await getInitialLLMQuestion(updatedBio) 
    const q1Message = convertQuestionToMessage(q1, thread?.id ?? null, 'onboarding')

    const newThread = await updateThreadAction({
      userId: userId,
      threadId: thread?.id ?? null,
      threadType: 'onboarding',
      messages: []
    });

    
    const updated = await updateThreadAction({
      userId: userId,
      threadId: newThread.id,
      threadType: 'onboarding',
      messages: [q1Message]
    });
    // inits thread object, replace this with a service call
    
    setThread(updated);
    setCurrentQuestion(q1);
    setIsAiLoading(false);
  }

  async function nextQuestion(answer: string) {
    if (!thread || !biometrics || !session?.user?.id) return;
    setIsAiLoading(true)
    
    const userId = session?.user?.id!
    
    const userMsg = convertResponseToMessage(answer, thread.id, 'onboarding')
    let updated = await updateThreadAction({
      userId: userId,
      threadId: thread.id,
      threadType: 'onboarding',
      messages: [userMsg]
    });
    const nextQn = await getNextLLMQuestion(biometrics, updated) 
    const nextMsg = convertQuestionToMessage(nextQn, updated.id, 'onboarding')
    updated = await updateThreadAction({
      userId: userId,
      threadId: updated.id,
      threadType: 'onboarding',
      messages: [nextMsg]
    });
    
    setThread(updated)
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