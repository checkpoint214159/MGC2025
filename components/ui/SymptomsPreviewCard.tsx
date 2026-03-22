"use client"

import { HeartPulse, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SymptomsPreviewCard({ data }: { data: any }) {
  const router = useRouter();
  const progress = data.progress;
  const morning = progress?.morning as any;
  const evening = progress?.evening as any;

  const morningDone = morning?.completed ?? false;
  const eveningDone = evening?.completed ?? false;

  const criticalFlagged = [
    ...(morning?.checklist || []),
    ...(evening?.checklist || []),
  ].filter((item: any) => item.critical && item.response === true).length;

  const totalLogs = (morning?.logs?.length || 0) + (evening?.logs?.length || 0);

  return (
    <div
      onClick={() => router.push('/recovery/symptoms')}
      className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-rose-100 p-2 rounded-lg text-rose-600">
            <HeartPulse size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Symptom Tracker</h3>
            <p className="text-sm text-slate-500 line-clamp-1">{data.summary}</p>
          </div>
        </div>
        <ArrowRight className="text-slate-300 group-hover:text-rose-500 transition-colors" size={20} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className={`text-[10px] font-bold px-2 py-1 rounded ${
          morningDone ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
        }`}>
          Morning: {morningDone ? 'Done' : 'Due'}
        </span>
        <span className={`text-[10px] font-bold px-2 py-1 rounded ${
          eveningDone ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
        }`}>
          Evening: {eveningDone ? 'Done' : 'Due'}
        </span>

        {criticalFlagged > 0 && (
          <span className="text-[10px] font-bold bg-red-50 text-red-700 px-2 py-1 rounded">
            {criticalFlagged} critical flagged
          </span>
        )}

        {totalLogs > 0 && (
          <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
            {totalLogs} symptom{totalLogs !== 1 ? 's' : ''} logged
          </span>
        )}
      </div>
    </div>
  );
}
