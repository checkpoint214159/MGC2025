"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DashboardRenderer from "@/component/recovery/DashboardRenderer";

const COLORECTAL_PATIENT_CONFIG = [
  {
    id: "check-1",
    type: "EXERCISE_TRACKER",
    props: {
      name: "Diaphragmatic Breathing",
      goal: "Promote internal healing and prevent lung congestion.",
      reps: "10 deep breaths every hour",
      precaution: "Stop if you feel dizzy or lightheaded.",
      intensityColor: "blue"
    },
  },
  {
    id: "check-2",
    type: "EXERCISE_TRACKER",
    props: {
      name: "Assisted Walking",
      goal: "Prevent blood clots (DVT) and wake up the bowels.",
      reps: "5 minute walk around the room",
      precaution: "Always have a caregiver present for the first 48 hours.",
      intensityColor: "orange"
    },
  }
];

export default function DashboardPage() {
    const router = useRouter();
    const { data: session, status, update } = useSession();

    // 2. AUTHENTICATION PROTECTION
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

    if (!session?.user?.dashboardConfig) {
        return null; // This avoids flickering before the redirect hits
    }

    return (
        <div className="p-8 max-w-5xl mx-auto pb-20">
            {/* 3. PERSONALIZED HEADER */}
            <header className="mb-10">
                <h1 className="text-3xl font-bold text-gray-900">
                    Welcome back, {session?.user?.name || "Patient"}
                </h1>
                <p className="text-gray-500 mt-2">
                    Here is your personalized recovery plan for today.
                </p>
            </header>

            {/* 4. THE DYNAMIC ENGINE */}
            <section>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-800">Your Tasks</h2>
                    <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold uppercase">
                        Active Recovery Phase
                    </span>
                </div>

                <DashboardRenderer config={COLORECTAL_PATIENT_CONFIG} />
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