"use client"

import { useSession } from "next-auth/react";
import { useRouter, redirect } from "next/navigation";
import { useEffect } from "react";


export async function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    // If user is an admin, they should access /admin dashboard instead
    if (session?.user?.role === "admin") {
      redirect("/admin");
      return;
    }

    // If onboarding not complete, send to onboarding flow
    if (session && !session.user.doneOnboarding) {
      redirect("/patient/info");
      return;
    }

  }, [status, session?.user?.doneOnboarding, session?.user?.role, router]);

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  // At this point: authenticated, onboarded, and non-admin
  return <>{children}</>;
}
