import { Stethoscope, AlertCircle } from "lucide-react";
import { DashboardCard } from "./DashboardUtils";

export default function SymptomPreviewCard({
    onClick,
}: {
    data?: unknown;
    onClick: () => void;
}) {
    return (
        <DashboardCard
            title="Symptom Tracker"
            subtitle="Monitoring recovery flare-ups"
            icon={Stethoscope}
            iconColorClass="bg-attention-soft text-attention-ink"
            onClick={onClick}
            footer={
                <div className="flex items-center gap-1 text-xs font-medium text-attention-ink">
                    <AlertCircle size={14} strokeWidth={1.75} />
                    Evening check-in due
                </div>
            }
        >
            <div className="flex items-center gap-4">
                <div className="flex flex-col">
                    <span className="text-[11px] font-medium text-ink-subtle">
                        Intensity
                    </span>
                    <span className="text-lg font-semibold text-ink">
                        Low (2/10)
                    </span>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="flex flex-col">
                    <span className="text-[11px] font-medium text-ink-subtle">
                        Primary Site
                    </span>
                    <span className="text-sm font-medium text-ink-muted">
                        Right Knee
                    </span>
                </div>
            </div>
        </DashboardCard>
    );
}
