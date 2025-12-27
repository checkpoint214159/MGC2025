import { useRouter } from "next/navigation";
import { DashboardConfig } from "@/components/recovery/registry";
import ExercisePreviewCard from "@/components/ui/ExercisePreviewCard";
import NutritionPreviewCard from "@/components/ui/NutritionPreviewCard";

export default function DashboardRenderer({ config }: { config: DashboardConfig }) {
  if (!config || !config.modules) {
    return (
      <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl text-center">
        <p className="text-slate-500 italic">No recovery plan found. Please generate one to begin.</p>
      </div>
    );
  }
  const router = useRouter();
  const { modules } = config;
  
  return (
    <div className="grid gap-6">
      {/* explicitly render for now */}
      
      {modules.exercise && (
        <ExercisePreviewCard 
          data={modules.exercise} 
          onClick={() => router.push('/recovery/fitness')} 
        />
      )}

      {modules.nutrition && (
        <NutritionPreviewCard 
          data={modules.nutrition} 
          onClick={() => router.push('/recovery/nutrition')}
        />
      )}
    </div>
  );
}