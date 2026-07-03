import { Moon, Timer } from "lucide-react";
import { DashboardCard } from "./DashboardUtils";

export default function SleepPreviewCard({
    onClick,
}: {
    data?: unknown;
    onClick: () => void;
}) {
    return (
        <DashboardCard
            title="Sleep & Rest"
            subtitle="Quality: Optimal (88%)"
            icon={Moon}
            iconColorClass="bg-accent-soft text-accent-ink"
            onClick={onClick}
            footer={
                <div className="text-xs font-medium text-ink-muted">
                    Deep sleep focus
                </div>
            }
        >
            <div className="space-y-3">
                <div className="flex items-end justify-between">
                    <div className="flex items-center gap-1.5 text-ink">
                        <Timer
                            size={16}
                            strokeWidth={1.75}
                            className="text-accent-ink"
                        />
                        <span className="text-xl font-semibold">7h 45m</span>
                    </div>
                    <span className="text-[11px] font-medium text-ink-subtle">
                        Goal: 8.5h
                    </span>
                </div>

                {/* Sleep progress bar */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
                    <div className="h-full w-[82%] bg-accent transition-all duration-1000" />
                </div>
            </div>
        </DashboardCard>
    );
}
