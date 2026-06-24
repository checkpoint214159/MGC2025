import { Stethoscope, AlertCircle, Activity } from "lucide-react";
import { DashboardCard } from "./DashboardUtils";

export default function SymptomPreviewCard({
    data,
    onClick,
}: {
    data: any;
    onClick: () => void;
}) {
    return (
        <DashboardCard
            title="Symptom Tracker"
            subtitle="Monitoring recovery flare-ups"
            icon={Stethoscope}
            iconColorClass="bg-amber-100 text-amber-600"
            accentColorClass="border-l-amber-500"
            onClick={onClick}
            footer={
                <div className="flex items-center gap-1 text-xs font-semibold text-amber-700 uppercase tracking-tight">
                    <AlertCircle size={14} />
                    Evening Check-in Due
                </div>
            }
        >
            <div className="flex items-center gap-4">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                        Intensity
                    </span>
                    <span className="text-lg font-black text-slate-900">
                        Low (2/10)
                    </span>
                </div>
                <div className="h-8 w-[1px] bg-slate-100" />
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                        Primary Site
                    </span>
                    <span className="text-sm font-bold text-slate-700">
                        Right Knee
                    </span>
                </div>
            </div>
        </DashboardCard>
    );
}
