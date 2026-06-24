// to force onboarding again.
"use client";

import { useTransition } from "react";
import { useSession } from "next-auth/react";
import { deleteOnboardingDataAction } from "@/lib/actions";
import { Button } from "@/components/ui/primitives";

export default function ForceOnboardingAction() {
    const [isPending, startTransition] = useTransition();
    const { data: session, update } = useSession();

    const handleDelOnboarding = () => {
        startTransition(async () => {
            try {
                await deleteOnboardingDataAction();
                await update({ session });
            } catch (error) {
                console.error("Failed to force delete onboarding data:", error);
            }
        });
    };

    return (
        <Button
            variant="destructive"
            size="sm"
            loading={isPending}
            onClick={handleDelOnboarding}
        >
            {isPending
                ? "Processing…"
                : "Force re-onboarding (delete profile, bio, screening)"}
        </Button>
    );
}
