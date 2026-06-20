import Providers from "@/components/providers/Providers"
import { cookies } from 'next/headers';
import { AuthGuard } from '@/components/guards/AuthGuard';
import { Geist, Geist_Mono } from "next/font/google";
import type { Metadata } from "next";
import React from "react";
import './globals.css';

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Recovery",
    description: "Your post-op recovery companion.",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {
    const cookieStore = await cookies();
    const initialDate = cookieStore.get('dev-simulated-date')?.value || new Date().toISOString();

    return (
        <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
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
