import { auth } from "@/auth";
import {fetchStateAction} from "@/lib/actions"
import RecoveryExerciseRenderer from "./ExerciseWidget"
import { StateSchema, ExerciseModule, ExerciseProgress, ExercisePlan } from "@/lib/state/schema";


export default async function FitnessPage() {
  const session = await auth()
  if (!session) return <p>Access Denied</p>;

  const fetch = await fetchStateAction();
  const state = StateSchema.parse(fetch.data)
  const exerciseModule: ExerciseModule = state.exercise
  const moduleId: string = exerciseModule.id

  const fail = () => {
    return (
      <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl text-center">
        <p className="text-slate-500 italic">No progress found. Contact ben and ask him why its all joever</p>
      </div>
    );
  }
  if (!exerciseModule.progress){
    return fail()
  }
  const exerciseProgress: ExerciseProgress = exerciseModule.progress

  // console.log('state?', state.modules.exercise.tasks[0].props)
  // console.log('exerciseTarget?', exerciseTarget.tasks[0].props)

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Exercise Detail</h1>
        <p className="text-slate-500">{exerciseModule?.summary}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {exerciseModule.plan.map((part: ExercisePlan) => {
          const progressEntry = exerciseProgress.trackables.find(
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