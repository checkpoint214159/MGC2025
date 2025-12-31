import { redirect } from "next/navigation";
import { State } from "@/lib/state/schema";
import ExercisePreviewCard from "@/components/ui/ExercisePreviewCard";
import NutritionPreviewCard from "@/components/ui/NutritionPreviewCard";

export default function DashboardRenderer({ config }: { config: State | null }) {
  if (!config) {
    return (
      <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl text-center">
        <p className="text-slate-500 italic">No recovery plan found. Please generate one to begin.</p>
      </div>
    );
  }
  
  return (
    <div className="grid gap-6">
      {/* explicitly render for now */}
      
      {config.exercise && (
        <ExercisePreviewCard 
          data={config.exercise} 
          onClick={() => redirect('/recovery/exercise')} 
        />
      )}

      {config.nutrition && (
        <NutritionPreviewCard 
          data={config.nutrition} 
          onClick={() => redirect('/recovery/nutrition')}
        />
      )}
    </div>
  );
}