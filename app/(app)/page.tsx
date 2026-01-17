"use client"

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchStateAction } from "@/lib/actions";
import { State } from "@/lib/state/schemas/state";
import DashboardRenderer from "@/components/recovery/DashboardRenderer";
import { useAppDate } from "@/context/DateContext";
import { DevDateSwitcher } from "@/components/DevDateSwitcher";
import { ensureAction } from "@/lib/utils";

export default function DashboardPage() {
    const router = useRouter();
    const { normalizedDate, isSimulated, displayDate, isToday } = useAppDate();

    const { data: session, status, update } = useSession();

    // query to retrieve state, if enabled
    const { data: state, isLoading } = useQuery({
        queryKey: ['recoveryState', session?.user?.id, normalizedDate],
        queryFn: async () => {
            const response = await fetchStateAction(normalizedDate);
            return ensureAction(response)
        },
        enabled: status === "authenticated" && !!session?.user?.id,
        staleTime: 1000 * 60 * 5, // Cache data for 5 minutes
    });
    // redirects only
    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        } else if (status === "authenticated" && !session?.user?.hasProfile) {
            router.push("/info");
        }
    }, [status, session?.user?.hasProfile, router]);

    // Updates session if today's data is present
    useEffect(() => {
        const checkSessionSync = async () => {
            const needsSync = state && isToday && !session?.hasTodayState && !isSimulated;
            
            if (needsSync) {
                console.log("Syncing session: today's state found.");
                await update();
            }
        };
        checkSessionSync();
    }, [state, normalizedDate, session?.hasTodayState, isSimulated, update, isToday]);

    // 4. RENDER LOGIC
    if (status === "loading" || isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <h2 className="text-xl font-semibold">Retrieving goodies...</h2>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-5xl mx-auto pb-20">
            <header className="mb-10 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Welcome back, {session?.user?.name || "Patient"}
                    </h1>
                    <p className={`text-sm mt-1 font-medium ${isSimulated ? 'text-orange-600' : 'text-gray-500'}`}>
                        Showing data for: {normalizedDate.toLocaleDateString('en-US', { 
                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                        })}
                        {isSimulated && " (Simulated)"}
                    </p>
                </div>
            </header>

            <section>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-800">Your Tasks</h2>
                    <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold uppercase">
                        Active Recovery Phase
                    </span>
                </div>

                {state ? (
                    <DashboardRenderer config={state} />
                ) : (
                    <div className="text-center p-20 border-2 border-dashed rounded-xl">
                        <p className="text-gray-400">No records found for this date.</p>
                    </div>
                )}
            </section>
            
            <button 
                onClick={() => router.push('/chat')}
                className="fixed bottom-6 left-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all z-40"
            >
                💬 Ask Assistant
            </button>

            <DevDateSwitcher />
        </div>
    );
}