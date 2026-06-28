"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();

    const publicRoutes = ["/login", "/signup"];
    // /preview/* are dev-only mockups (proxy.ts 404s them in production); let them
    // render without auth so the demo flow is reachable straight from `npm run dev`.
    const isPublicRoute =
        publicRoutes.includes(pathname) || pathname.startsWith("/preview");

    useEffect(() => {
        if (status === "loading") return;

        if (status === "unauthenticated" && !isPublicRoute) {
            router.replace("/login");
        }
    }, [status, router, pathname]);

    // Public routes (login, signup, /preview/* mockups) need no session — render them
    // immediately so they SSR and don't flash a loading gate.
    if (status === "loading" && !isPublicRoute) return <div>Loading...</div>;

    return <>{children}</>;
}
