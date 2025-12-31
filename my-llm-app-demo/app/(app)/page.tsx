"use client"

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { fetchStateAction } from "@/lib/actions"
import { State } from "@/lib/state/schema";
import DashboardRenderer from "@/components/recovery/DashboardRenderer";

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export default function DashboardPage() {
    const router = useRouter();
    const [state, setState] = useState<State | null>(null);
    const { data: session, status, update } = useSession();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const checkState = async () => {
            if (status === "unauthenticated") {
                router.push("/login");
            }
            if (status === "authenticated") {
                console.log('session use profile?', !session?.user?.profile)
                if (!session?.user?.profile) {
                    router.push("/info");
                }
                if (!state) {
                    try {
                        const response = await fetchStateAction();
                        if (response.success) {
                            // This triggers a re-render so DashboardRenderer gets the data
                            setState(response.data as unknown as State); 
                            
                            // Only update session if the flag was missing
                            if (!session.hasTodayState) {
                                await update({});
                            }
                        }
                    } catch (error) {
                        console.error("State fetching failed", error);
                    } finally {
                        setLoading(false);
                        sleep(5000)
                    }
                } else {
                    setLoading(false);
                }
            }
        }

        checkState()
    }, [status, session, router, update]);

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

                <DashboardRenderer config={state} />
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