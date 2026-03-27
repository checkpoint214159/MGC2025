"use client"

import { useSession } from "next-auth/react";
import { fetchStateAction } from "@/lib/actions"
import NutritionDashboard from "./NutritionWidget"
import { NutritionModule } from "@/lib/state/schemas/nutrition";
import { getModuleFromState } from "@/lib/utils";
import { useAppDate } from "@/context/DateContext";
import { useQuery } from "@tanstack/react-query";
import { ensureAction } from "@/lib/utils";


export default function NutritionPage() {
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

  const nutritionModule: NutritionModule | null = getModuleFromState(state, 'nutrition')
    if (!nutritionModule || !nutritionModule.progress || !nutritionModule.plan) {
      return fail()
    }
    const { progress, plan, id: moduleId } = nutritionModule;
  
  if (!nutritionModule.progress){
    return fail()
  }
  const nutritionProgress = nutritionModule.progress
  

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Nutrition Recovery</h1>
        <p className="text-slate-500 italic">Fueling your tissue repair and hydration.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {nutritionModule.plan.map((part) => {
          console.log('trackables matching ids?', nutritionProgress.trackables)
          const progressEntry = nutritionProgress.trackables.find(
            (t) => t.id == part.id
          );
          if (!progressEntry) {
            return fail()
          }
          return (
            <div key={part.id} className="border rounded-xl p-4 bg-white shadow-sm">
              <NutritionDashboard 
                plan={part}
                trackable={progressEntry}
                moduleId={moduleId}
              />
            </div>
          )
        })}
      </div>
      
    </div>
  );
}