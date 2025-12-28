"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react"
import { DashboardConfig } from "@/components/recovery/registry";
import RecoveryExerciseRenderer from "./ExerciseWidget";


export default function FitnessPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  if (status === "loading") return <p>Loading...</p>;
  if (!session) return <p>Access Denied</p>;

  const userConfig = session.user.dashboardConfig as DashboardConfig
  console.log(userConfig)
  const exerciseModule = userConfig?.modules?.exercise;

  // if (status !== "loading" && !exerciseModule) {
  //   return (
  //     <div className="p-8 text-center">
  //       <p className="text-slate-500">No exercises found in your plan.</p>
  //       <button onClick={() => router.push('/')} className="text-blue-600 underline">
  //         Go Back
  //       </button>
  //     </div>
  //   );
  // }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Exercise Detail</h1>
        <p className="text-slate-500">{exerciseModule?.summary}</p>
      </header>

      {/* 3. The Layout Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {exerciseModule?.tasks.map((task) => (
          <div key={task.id} className="border rounded-xl p-4 bg-white shadow-sm">
            {/* Pass the task props to your renderer */}
            <RecoveryExerciseRenderer {...task.props} isPreview={false} />
          </div>
        ))}
      </div>
    </div>
  );
}