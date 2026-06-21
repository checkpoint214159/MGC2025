// to force onboarding again.
"use client";

import { useTransition } from 'react';
import { useSession } from "next-auth/react";
import { deleteOnboardingDataAction } from '@/lib/actions';

export default function ForceOnboardingAction() {
    const [isPending, startTransition] = useTransition();
    const { data:session, update } = useSession();

    const handleDelOnboarding = () => {
        startTransition(async () => {
            try {
                await deleteOnboardingDataAction()
                await update({session})
            } catch (error) {
                console.error("Failed to force delete onboarding data:", error);
            }
        })
    }

    return <button
        onClick={handleDelOnboarding}
        disabled={isPending}
        className={`px-4 py-2 rounded ${isPending ? 'bg-gray-400' : 'bg-blue-600 text-white'}`}
    >
        {isPending ? (
        <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Processing...</span>
        </div>
      ) : (
        "Force Re-onboarding (delete profile, bio, screening)"
      )}
    </button>
}