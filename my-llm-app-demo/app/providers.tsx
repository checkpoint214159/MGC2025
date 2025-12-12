// app/providers.tsx
'use client';

import { SessionProvider } from 'next-auth/react';
import React from 'react';

// This component wraps your entire app to provide session context
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}