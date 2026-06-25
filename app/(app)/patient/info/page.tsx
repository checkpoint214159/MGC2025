"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { getOnboardingStateAction } from "@/lib/actions";
import { SubmitBiometricsPage } from "./BiometricsPage";
import { ScreeningPage } from "./ScreeningPage";
import { QuestionPage } from "./QuestionPage";

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

    if (onboardingState.phase === "screening_blocked") {
        return <ScreeningBlockedScreen />;
    }

    return (
        <div className="flex flex-col items-center justify-start min-h-screen bg-bg p-6 overflow-hidden pt-20">
            {onboardingState.phase === "biometrics" && <SubmitBiometricsPage />}

            {onboardingState.phase === "collect_screening_responses" && (
                <ScreeningPage questions={onboardingState.questions} />
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

function ScreeningBlockedScreen() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-bg p-6 text-center">
            <div className="max-w-md space-y-4">
                <h2 className="text-2xl font-bold text-slate-900">
                    Please check with your doctor first
                </h2>
                <p className="text-slate-600">
                    Based on your screening answers, you should be cleared by a
                    doctor before starting an unsupervised recovery programme.
                    Please consult your physician and have them certify that you
                    are in good condition to proceed.
                </p>
                <p className="text-sm text-slate-400">
                    If your doctor has already assessed you, ask them to assign
                    you within the app so you can continue.
                </p>
            </div>
        </div>
    );
}
