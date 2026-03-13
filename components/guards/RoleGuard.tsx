"use client"

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export function RoleGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "loading") return;

    const pathSegments = pathname.split('/').filter(Boolean);
    const currentRoot = pathSegments[0];

    const userRole = session?.user?.role;

    if (currentRoot !== userRole) {
      router.replace(`/${userRole}`);
    }
  }, [status, session?.user?.role, pathname, router]);

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  return <>{children}</>;
}

