"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { DateProvider } from "@/context/DateContext";
import { useState } from "react";

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
          {children}
        </SessionProvider>
      </DateProvider>
    </QueryClientProvider>
  );
}