"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DashboardRenderer from "@/components/recovery/DashboardRenderer";
import { DashboardConfig } from "@/components/recovery/registry";


export default function DashboardPage() {
    const router = useRouter();
    const { data: session, status } = useSession();

    const userConfig = (session?.user?.dashboardConfig as unknown as DashboardConfig)

    // authenticate + get info
    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        }
        if (status === "authenticated" && !session?.user?.treatment) {
            router.push("/info");
        }
    }, [status, session, router]);

    if (status === "loading") {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-pulse text-blue-600 font-medium">
                    Initializing your recovery plan...
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-5xl mx-auto pb-20">
            <header className="mb-10">
                <h1 className="text-3xl font-bold text-gray-900">
                    Welcome back, {session?.user?.name || "Patient"}
                </h1>
            </header>

            <section>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-800">Your Tasks</h2>
                    <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold uppercase">
                        Active Recovery Phase
                    </span>
                </div>

                <DashboardRenderer config={userConfig} />
            </section>
            
            {/* Optional: Keep your chat as a "Help" button in the corner */}
            <button 
                onClick={() => router.push('/chat')}
                className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all"
            >
                💬 Ask Assistant
            </button>
        </div>
    );
}