import { ArrowRight, Activity } from "lucide-react";
import { DashboardCard } from "./DashboardUtils";

export default function ExercisePreviewCard({
    data,
    onClick,
}: {
    data: any;
    onClick: () => void;
}) {
    return (
        <DashboardCard
            title="Exercise"
            subtitle={data.summary || "Daily recovery movements"}
            icon={Activity}
            iconColorClass="bg-blue-100 text-blue-600"
            accentColorClass="border-l-blue-600"
            onClick={onClick}
            footer={
                <div className="mt-4 flex gap-4">
                    <div className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">
                        {data.plan.length} Movements
                    </div>
                </div>
            }
        ></DashboardCard>
    );
}
