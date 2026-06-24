"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Guards the `/app` routes (patient-facing dashboard and features).
 *
 * Ensures:
 * 1. User has completed onboarding (redirects to /info if not)
 * 2. Non-admins are allowed here; admins are redirected to /admin
 *
 * This guard sits between the server-side auth check (in layout.tsx)
 * and the page content, handling client-side redirects that require session data.
 */
export function OnboardingGuard({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const router = useRouter();
    useEffect(() => {
        if (status === "loading") return;

        if (session && !session.user.doneOnboarding) {
            router.replace("/patient/info");
            return;
        }
    }, [status, session?.user?.doneOnboarding, router]);

    if (status === "loading") {
        return <div>Loading...</div>;
    }

    // At this point: authenticated, onboarded, and non-admin
    return <>{children}</>;
}
