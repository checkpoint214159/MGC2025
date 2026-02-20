"use client"

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const publicRoutes = ["/login", "/signup"];
  const isPublicRoute = publicRoutes.includes(pathname);

  useEffect(() => {
    
    // todo: improve control flow
    if (status === "loading") return;

    if (status === "unauthenticated" && !isPublicRoute) {
      router.replace("/login");
      return;
    }
    
    if (session && !session.user.doneOnboarding && !isPublicRoute) {
      router.replace("/info");
    }

  }, [status, session, router, pathname]);

  if (status === "loading") return <div>Loading Security...</div>;
  
  return <>{children}</>;
}