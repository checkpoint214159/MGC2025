import Providers from "@/components/providers/Providers"
import { cookies } from 'next/headers';
import { AuthGuard } from '@/components/guards/AuthGuard';
import React from "react";
import './globals.css';

interface RootLayoutProps {
  children: React.ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {
    const cookieStore = await cookies();
    const initialDate = cookieStore.get('dev-simulated-date')?.value || new Date().toISOString();

    return (
        <html lang="en">
            <body>
                <Providers initialDate={initialDate}>
                    <AuthGuard>
                        {children}
                    </AuthGuard>
                </Providers>
            </body>
        </html>
    );
}