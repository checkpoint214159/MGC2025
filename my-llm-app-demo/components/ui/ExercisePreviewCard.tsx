import { ArrowRight, Activity } from "lucide-react";

export default function ExercisePreviewCard({ data, onClick }: { data: any, onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* Icon Circle */}
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

      {/* Mini Stats Row */}
      <div className="mt-4 flex gap-4">
        <div className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">
          {data.tasks.length} Movements
        </div>
        <div className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
          Active Recovery
        </div>
      </div>
    </div>
  );
}