"use client"

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    if (session && !session.user.hasProfile && pathname !== "/info") {
      router.replace("/info");
    }
  }, [status, session, router, pathname]);

  if (status === "loading") return <div>Loading Security...</div>;
  
  return <>{children}</>;
}