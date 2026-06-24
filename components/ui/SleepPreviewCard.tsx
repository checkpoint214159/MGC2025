import { Moon, Sparkles, Timer } from "lucide-react";
import { DashboardCard } from "./DashboardUtils";

export default function SleepPreviewCard({
    data,
    onClick,
}: {
    data: any;
    onClick: () => void;
}) {
    return (
        <DashboardCard
            title="Sleep & Rest"
            subtitle="Quality: Optimal (88%)"
            icon={Moon}
            iconColorClass="bg-indigo-100 text-indigo-600"
            accentColorClass="border-l-indigo-500"
            onClick={onClick}
            footer={
                <div className="flex items-center gap-1 text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                    <Sparkles size={12} fill="currentColor" /> Deep Sleep Focus
                </div>
            }
        >
            <div className="space-y-3">
                <div className="flex justify-between items-end">
                    <div className="flex items-center gap-1.5 text-indigo-900">
                        <Timer size={16} className="text-indigo-500" />
                        <span className="text-xl font-black">7h 45m</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                        Goal: 8.5h
                    </span>
                </div>

                {/* Sleep Progress Bar */}
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full w-[82%] transition-all duration-1000" />
                </div>
            </div>
        </DashboardCard>
    );
}
