"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Stethoscope, TriangleAlert } from "lucide-react";
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

    // Onboarding is finished — either the session flag (fastest signal) or the
    // graph reports "complete". Navigate in an effect, never during render, or React
    // throws "Cannot update a component (Router) while rendering OnboardingFlow".
    const isComplete =
        !!session?.user?.doneOnboarding ||
        onboardingState?.phase === "complete";

    useEffect(() => {
        if (isComplete) router.push("/");
    }, [isComplete, router]);

    if (isComplete) {
        return <LoadingScreen message="Taking you to your dashboard…" />;
    }

    if (isLoading || !onboardingState) {
        return <LoadingScreen message="Loading..." />;
    }

    if (onboardingState.phase === "error") {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
                <div className="max-w-md space-y-2">
                    <div className="mx-auto mb-2 grid size-12 place-items-center rounded-full bg-critical-soft text-critical-ink">
                        <TriangleAlert size={24} strokeWidth={1.75} />
                    </div>
                    <h2 className="text-[22px] font-semibold text-ink">
                        Something went wrong
                    </h2>
                    <p className="text-[15px] text-ink-muted">
                        {onboardingState.message}
                    </p>
                </div>
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
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-5">
            <span className="size-9 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <h2 className="text-[17px] font-medium text-ink-muted">
                {message}
            </h2>
        </div>
    );
}

function ScreeningBlockedScreen() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-bg p-6 text-center">
            <div className="max-w-md space-y-4">
                <div className="mx-auto grid size-12 place-items-center rounded-full bg-attention-soft text-attention-ink">
                    <Stethoscope size={24} strokeWidth={1.75} />
                </div>
                <h2 className="text-[24px] font-semibold text-ink">
                    Please check with your doctor first
                </h2>
                <p className="text-[15px] leading-relaxed text-ink-muted">
                    Based on your screening answers, you should be cleared by a
                    doctor before starting an unsupervised recovery programme.
                    Please consult your physician and have them certify that you
                    are in good condition to proceed.
                </p>
                <p className="text-[13px] text-ink-subtle">
                    If your doctor has already assessed you, ask them to assign
                    you within the app so you can continue.
                </p>
            </div>
        </div>
    );
}
