import { auth } from "@/auth";
import { fetchStateAction } from "@/lib/actions"
import { State, StateSchema } from "@/lib/state/schema"
import NutritionDashboard from "./NutritionWidget"
import { NutritionModule } from "@/lib/state/schema";


export default async function NutritionPage() {
  const session = await auth()
  if (!session) return <p>Access Denied</p>;

  const fetch = await fetchStateAction();
  // console.log('fetched data nutrition', fetch.data)
  const state = StateSchema.parse(fetch.data)
  const nutritionModule: NutritionModule = state.nutrition
  // console.log('after parse nutritionModule', nutritionModule.progress.trackables)
  const moduleId: string = nutritionModule.id

  const fail = () => {
    return (
      <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl text-center">
        <p className="text-slate-500 italic">No progress found. Contact ben and ask him why its all joever</p>
      </div>
    );
  }
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