"use client"

import { Moon, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { SLEEP_THEME } from "@/lib/state/ui";
import { useRouter } from "next/navigation";

export default function SleepPreviewCard({ data }: { data: any }) {
  const router = useRouter();
  const trackables = data.progress?.trackables as any[] || [];
  const sleepTrackable = trackables[0];
  const sleepData = sleepTrackable?.data || {};

  const hours = sleepData.hoursSlept;
  const quality = sleepData.sleepQuality;
  const hoursPercent = hours ? Math.min((hours.value / hours.goal) * 100, 100) : 0;

  return (
    <div
      onClick={() => router.push('/recovery/sleep')}
      className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`${SLEEP_THEME.bg} p-2 rounded-lg ${SLEEP_THEME.color}`}>
            <Moon size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Sleep & Rest</h3>
            <p className="text-sm text-slate-500 line-clamp-1">{data.summary}</p>
          </div>
        </div>
        <ArrowRight className="text-slate-300 group-hover:text-indigo-500 transition-colors" size={20} />
      </div>

      {hours && (
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-slate-500">Hours Slept</span>
            <span className="text-slate-900 font-bold">{hours.value} / {hours.goal} hrs</span>
          </div>
          <Progress
            value={hoursPercent}
            className="h-2"
            indicatorColor={SLEEP_THEME.barColor}
          />
        </div>
      )}

      <div className="mt-3 flex gap-3">
        {quality && (
          <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-1 rounded">
            Quality: {quality.value}/{quality.goal}
          </span>
        )}
      </div>
    </div>
  );
}
