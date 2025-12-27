import { Utensils, Zap } from "lucide-react";

export default function NutritionPreviewCard({ data, onClick }: { data: any, onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
          <Utensils size={20} />
        </div>
        <div>
          <h3 className="font-bold text-slate-900">Nutrition Plan</h3>
          <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
            {data.title}
          </p>
        </div>
      </div>

      {/* Calorie Bar Preview */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-medium">
          <span className="text-slate-500">Daily Target</span>
          <span className="text-slate-900 font-bold">{data.goalCalories} kcal</span>
        </div>
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div className="bg-orange-400 h-full w-1/3 rounded-full" /> {/* Static preview of progress */}
        </div>
      </div>
      
      <div className="mt-4 flex items-center text-blue-600 text-xs font-bold gap-1">
        <Zap size={12} />
        VIEW MEALS & MACROS
      </div>
    </div>
  );
}