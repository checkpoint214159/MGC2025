"use client"

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { fetchStateAction } from "@/lib/actions";
import DashboardRenderer from "@/app/(app)/patient/dashboard/DashboardRenderer";
import { useAppDate } from "@/context/DateContext";
import { DevDateSwitcher } from "@/components/development/DevDateSwitcher";
import { ensureAction } from "@/lib/utils";
import ForceGenerateButton from "@/components/development/ForceStateGeneration";
import ForceOnboardingAction from "@/components/development/ForceOnboarding";
import { State } from "@/lib/state/schemas/state";


export default function UserDashboard() {
    const { normalizedDate, isSimulated } = useAppDate();
    const { data: session, status } = useSession();

    // Fetch recovery state for the current date (moved outside conditional)
    const { data: state, isLoading: queryLoading } = useQuery({
        queryKey: ['recoveryState', session?.user?.id, normalizedDate],
        queryFn: async () => {
            const response = await fetchStateAction(normalizedDate);
            return ensureAction(response)
        },
        enabled: status === "authenticated" && !!session?.user?.id,
        staleTime: 1 // Cache data for 5 minutes
    });

    // Render loading state
    if (status === "loading" || queryLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <h2 className="text-xl font-semibold">Retrieving goodies...</h2>
            </div>
        );
    }

    console.log("state", state)
    // Render dashboard content
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
            
            {process.env.NODE_ENV === 'development' && (
                <div className="mt-20 p-6 bg-red-50 border-2 border-red-200 rounded-2xl">
                    <h3 className="text-red-800 font-bold mb-4 uppercase tracking-wider text-xs">
                    Admin / Dev Tools
                    </h3>
                    <div className="flex flex-wrap gap-4">
                    <DevDateSwitcher />
                    <ForceGenerateButton normalizedDate={normalizedDate}/>
                    <ForceOnboardingAction />
                    </div>
                </div>
                )}
        </div>
    );
}
