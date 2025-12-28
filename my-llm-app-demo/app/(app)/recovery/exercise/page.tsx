import { auth } from "@/auth";
import {fetchStateAction} from "@/lib/actions"
import RecoveryExerciseRenderer from "./ExerciseWidget"
import { State } from "@/lib/state/schema";


export default async function FitnessPage() {
  const session = await auth()
  if (!session) return <p>Access Denied</p>;

  const fetch = await fetchStateAction();

  const target = fetch?.data?.target as State
  const exerciseTarget = target.modules.exercise

  const state = fetch?.data?.state as State
  const exerciseState = state.modules.exercise
  
  // console.log('state?', state.modules.exercise.tasks[0].props)
  // console.log('exerciseTarget?', exerciseTarget.tasks[0].props)

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Exercise Detail</h1>
        <p className="text-slate-500">{exerciseTarget?.summary}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {exerciseTarget.tasks.map((task) => {
          // Find the corresponding tracking state for this specific task
          const taskProgress = exerciseState.tasks.find(
            (s: any) => s.id === task.id
          );
          console.log('taskProgress in FitnessPage', taskProgress)

          return (
            <div key={task.id} className="border rounded-xl p-4 bg-white shadow-sm">
              <RecoveryExerciseRenderer 
                task={task} 
                currentValue={taskProgress?.props.value || 0}
                isPreview={false} 
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}