"use client"

import { ArrowRight, Activity } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useRouter } from "next/navigation";

export default function ExercisePreviewCard({ data }: { data: any }) {
  const router = useRouter();
  const plan = data.plan as any[];
  const trackables = data.progress?.trackables as any[] || [];

  // Calculate completion: an exercise is "completed" when all metrics >= 80% of goal
  let completedCount = 0;
  for (const trackable of trackables) {
    const metrics = Object.values(trackable.data) as any[];
    const allComplete = metrics.every((m: any) => m.goal === 0 || (m.value / m.goal) >= 0.8);
    if (allComplete) completedCount++;
  }
  const totalCount = plan.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Intensity breakdown
  const intensityCounts = { blue: 0, orange: 0, red: 0 };
  for (const item of plan) {
    const intensity = item.meta?.intensity as keyof typeof intensityCounts;
    if (intensity in intensityCounts) intensityCounts[intensity]++;
  }

  return (
    <div
      onClick={() => router.push('/recovery/exercise')}
      className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
            <Activity size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Mobility & Exercise</h3>
            <p className="text-sm text-slate-500 line-clamp-1">{data.summary}</p>
          </div>
        </div>
        <ArrowRight className="text-slate-300 group-hover:text-blue-500 transition-colors" size={20} />
      </div>

      {/* Live Progress */}
      <div className="mt-4 space-y-2">
        <div className="flex justify-between text-xs font-medium">
          <span className="text-slate-500">{completedCount}/{totalCount} exercises completed</span>
          <span className="text-slate-900 font-bold">{Math.round(progressPercent)}%</span>
        </div>
        <Progress
          value={progressPercent}
          className="h-2"
          indicatorColor={progressPercent >= 80 ? "#22c55e" : progressPercent >= 50 ? "#f59e0b" : "#3b82f6"}
        />
      </div>

      {/* Intensity & Stats */}
      <div className="mt-3 flex gap-3 items-center">
        <div className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">
          {totalCount} Movements
        </div>
        <div className="flex gap-1.5">
          {intensityCounts.blue > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />{intensityCounts.blue}
            </span>
          )}
          {intensityCounts.orange > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />{intensityCounts.orange}
            </span>
          )}
          {intensityCounts.red > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />{intensityCounts.red}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
