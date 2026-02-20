"use client"

import { useSession } from "next-auth/react";
import { fetchStateAction } from "@/lib/actions"
import RecoveryExerciseRenderer from "./ExerciseWidget"
import { ExerciseModule, ExerciseProgress, ExercisePlan } from "@/lib/state/schemas/exercise";
import { useQuery } from "@tanstack/react-query";
import { useAppDate } from "@/context/DateContext";
import { ensureAction } from "@/lib/utils";
import { getModuleFromState } from "@/lib/utils";


export default function FitnessPage() {
  const { data: session, status, update } = useSession();
  
  if (!session) return <p>Access Denied</p>;

  const { normalizedDate, isSimulated, displayDate, isToday } = useAppDate();
  
  const { data: state, isLoading } = useQuery({
      queryKey: ['recoveryState', session?.user?.id, normalizedDate],
      queryFn: async () => {
          const response = await fetchStateAction(normalizedDate);
          return ensureAction(response)
      },
      enabled: status === "authenticated" && !!session?.user?.id,
      staleTime: 1000 * 60 * 5, // Cache data for 5 minutes
  });

  const fail = () => {
    return (
      <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl text-center">
        <p className="text-slate-500 italic">No progress found. Contact ben and ask him why its all joever</p>
      </div>
    );
  }

  const exerciseModule: ExerciseModule | null = getModuleFromState(state, 'exercise')
  console.log('exerciseModule??', exerciseModule)
  if (!exerciseModule || !exerciseModule.progress || !exerciseModule.plan) {
    return fail()
  }
  const { progress, plan, id: moduleId } = exerciseModule;

  console.log('progress,', progress)
  console.log('plan', plan)

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Exercise Detail</h1>
        <p className="text-slate-500">{exerciseModule?.summary}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {plan.map((part: ExercisePlan) => {
          const progressEntry = progress.trackables.find(
            (t) => t.id === part.id
          );
          if (!progressEntry){
            return fail()
          }
          const trackable: ExercisePlan = progressEntry;
          
          return (
            <div key={part.id} className="border rounded-xl p-4 bg-white shadow-sm">
              <RecoveryExerciseRenderer 
                plan={part} 
                trackable={trackable}
                moduleId={moduleId}
                isPreview={false} 
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}