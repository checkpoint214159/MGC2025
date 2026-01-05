"use client"

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { fetchStateAction } from "@/lib/actions";
import { State } from "@/lib/state/schemas/state";
import DashboardRenderer from "@/components/recovery/DashboardRenderer";
import { useAppDate } from "@/context/DateContext";
import { DevDateSwitcher } from "@/components/DevDateSwitcher";

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export default function DashboardPage() {
    const router = useRouter();
    const { normalizedDate, isSimulated } = useAppDate(); // Get date from context
    const [state, setState] = useState<State | null>(null);
    const { data: session, status, update } = useSession();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const checkState = async () => {
            if (status === "unauthenticated") {
                router.push("/login");
                return;
            }

            if (status === "authenticated") {
                if (!session?.user?.profile) {
                    router.push("/info");
                    return;
                }

                // IMPORTANT: We now fetch state whenever normalizedDate changes.
                // We reset the local state to null to force a refresh if the date changes.
                setLoading(true);
                try {
                    // Make sure fetchStateAction is updated to accept a date argument,
                    // or it uses cookies internally to see the simulated date.
                    const response = await fetchStateAction(); 
                    
                    if (response.success) {
                        setState(response.data as unknown as State);
                        
                        // We check the session flag. Note: 'hasTodayState' logic 
                        // might need a tweak if you're viewing historical data.
                        if (!session.hasTodayState && !isSimulated) {
                            await update({});
                        }
                    } else {
                        setState(null); // No data for this specific date
                    }
                } catch (error) {
                    console.error("State fetching failed", error);
                } finally {
                    setLoading(false);
                }
            }
        };

        checkState();
        // Added normalizedDate to the dependency array. 
        // When you change the date in the switcher, this effect re-runs!
    }, [status, session, router, update, normalizedDate, isSimulated]);

    if (loading) {
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
                    {/* Display the selected date from context */}
                    <p className={`text-sm mt-1 font-medium ${isSimulated ? 'text-orange-600' : 'text-gray-500'}`}>
                        Showing data for: {normalizedDate.toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
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