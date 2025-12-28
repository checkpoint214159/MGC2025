import { auth } from "@/auth";
import { fetchStateAction } from "@/lib/actions"
import { State } from "@/lib/state/schema"
import { NutritionDashboard } from "./NutritionWidget"
import { NutritionModule } from "@/lib/state/schema";


export default async function NutritionPage() {
  const session = await auth()
  if (!session) return <p>Access Denied</p>;

  const fetch = await fetchStateAction();
  const target = fetch?.data?.target as State
  const nutritionTarget = target.modules.nutrition as NutritionModule

  const state = fetch?.data?.state as State
  const nutritionState = state.modules.nutrition as NutritionModule

  console.log('nutritionState', nutritionState)

  /*
  28/12/2025
  Opt to render into 3 buckets, calorie count, macro and micro.
  Note calorie is still a type of macro, we just want it to look bigger
  **/
  
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Nutrition Recovery</h1>
        <p className="text-slate-500 italic">Fueling your tissue repair and hydration.</p>
      </header>
      
      <NutritionDashboard 
        target={nutritionTarget} 
        state={nutritionState} 
      />
    </div>
  );
}