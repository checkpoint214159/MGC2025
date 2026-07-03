import { Activity } from "lucide-react";
import { DashboardCard } from "./DashboardUtils";

export default function ExercisePreviewCard({
    data,
    onClick,
}: {
    data: { summary?: string | null; plan: unknown[] };
    onClick: () => void;
}) {
    return (
        <DashboardCard
            title="Exercise"
            subtitle={data.summary || "Daily recovery movements"}
            icon={Activity}
            iconColorClass="bg-accent-soft text-accent-ink"
            onClick={onClick}
            footer={
                <div className="mt-4 flex gap-4">
                    <div className="rounded-sm bg-surface-sunken px-2 py-1 text-xs font-medium text-ink-muted">
                        {data.plan.length} Movements
                    </div>
                </div>
            }
        ></DashboardCard>
    );
}
