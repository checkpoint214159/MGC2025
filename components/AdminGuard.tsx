"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AdminGuard({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (session?.user?.role !== "admin") {
            router.replace("/user");
            return;
        } else {
            router.replace("/admin");
            return;
        }
    }, [status, session?.user?.role, router]);

    if (status === "loading") {
        return <div>Loading...</div>;
    }

    // At this point: authenticated and admin
    return <>{children}</>;
}
