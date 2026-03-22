"use client"

import { Utensils, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useRouter } from "next/navigation";

export default function NutritionPreviewCard({ data }: { data: any }) {
  const router = useRouter();
  const trackables = data.progress?.trackables as any[] || [];
  const checklistState = data.progress?.checklistState as Record<string, boolean> || {};
  const checklists = data.checklists as any[] || [];

  // Find macros plan item from progress trackables
  const macrosTrackable = trackables.find((t: any) => t.meta?.type === "macros");
  const macrosData = macrosTrackable?.data || {};

  const calories = macrosData.calories;
  const protein = macrosData.protein;
  const carbs = macrosData.carbs;
  const fats = macrosData.fats;

  const caloriePercent = calories ? Math.min((calories.value / calories.goal) * 100, 100) : 0;

  // Checklist progress
  const checklistTotal = checklists.length;
  const checklistDone = Object.values(checklistState).filter(Boolean).length;

  return (
    <div
      onClick={() => router.push('/recovery/nutrition')}
      className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
          <Utensils size={20} />
        </div>
        <div>
          <h3 className="font-bold text-slate-900">Nutrition Plan</h3>
          <p className="text-sm text-slate-500 line-clamp-1">{data.summary}</p>
        </div>
      </div>

      {/* Live Calorie Bar */}
      {calories && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-slate-500">Calories</span>
            <span className="text-slate-900 font-bold">{calories.value} / {calories.goal} kcal</span>
          </div>
          <Progress
            value={caloriePercent}
            className="h-2"
            indicatorColor={caloriePercent >= 80 ? "#22c55e" : caloriePercent >= 50 ? "#f59e0b" : "#f97316"}
          />
        </div>
      )}

      {/* Macro Pills */}
      <div className="mt-3 flex flex-wrap gap-2">
        {protein && (
          <span className="text-[10px] font-bold text-orange-700 bg-orange-50 px-2 py-1 rounded">
            Protein: {protein.value}/{protein.goal}g
          </span>
        )}
        {carbs && (
          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded">
            Carbs: {carbs.value}/{carbs.goal}g
          </span>
        )}
        {fats && (
          <span className="text-[10px] font-bold text-yellow-700 bg-yellow-50 px-2 py-1 rounded">
            Fats: {fats.value}/{fats.goal}g
          </span>
        )}
      </div>

      {/* Checklist Progress + CTA */}
      <div className="mt-3 flex items-center justify-between">
        {checklistTotal > 0 && (
          <span className="text-[10px] font-medium text-slate-500">
            {checklistDone}/{checklistTotal} items checked
          </span>
        )}
        <div className="flex items-center text-blue-600 text-xs font-bold gap-1 ml-auto">
          <Zap size={12} />
          VIEW MEALS & MACROS
        </div>
      </div>
    </div>
  );
}
