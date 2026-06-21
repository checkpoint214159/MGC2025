"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { DateProvider } from "@/context/DateContext";
import { CaregiverProvider } from "@/context/CaregiverContext";
import { TextScaleProvider } from "@/context/TextScaleContext";
import { useState } from "react";

/**
 * Root providers wrapper for the application.
 * Combines React Query, NextAuth sessions, and date context.
 */
export default function Providers({ children, initialDate }: { children: React.ReactNode, initialDate: string }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <DateProvider initialDate={initialDate}>
        <SessionProvider>
          <TextScaleProvider>
            <CaregiverProvider>{children}</CaregiverProvider>
          </TextScaleProvider>
        </SessionProvider>
      </DateProvider>
    </QueryClientProvider>
  );
}
