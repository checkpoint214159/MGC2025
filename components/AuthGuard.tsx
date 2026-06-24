"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Global guard ensuring user is authenticated.
 * Redirects unauthenticated users to /login.
 *
 * Onboarding flow is handled separately by OnboardingGuard.
 * Role-based access is handled by AdminGuard.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();

    const publicRoutes = ["/login", "/signup"];
    const isPublicRoute = publicRoutes.includes(pathname);

    useEffect(() => {
        if (status === "loading") return;

        // Redirect unauthenticated users to login (except on public routes)
        if (status === "unauthenticated" && !isPublicRoute) {
            router.replace("/login");
        }
    }, [status, router, pathname]);

    if (status === "loading") return <div>Loading...</div>;

    return <>{children}</>;
}
