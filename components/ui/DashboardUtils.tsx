import { ArrowRight, LucideIcon } from "lucide-react";
import { ReactNode } from "react";

/**
 * ModuleCard-family primitives (DESIGN.md): surface card with a warm hairline border,
 * radius-lg, quiet hover shadow when tappable. No side-stripe accents, no lift-translates —
 * the icon chip's soft tint is the only per-module color.
 */
interface DashboardCardProps {
    title: string;
    subtitle?: string;
    icon: LucideIcon;
    /** Token pair for the icon chip, e.g. "bg-accent-soft text-accent-ink". */
    iconColorClass: string;
    onClick: () => void;
    children?: ReactNode;
    headerBadge?: ReactNode;
    footer?: ReactNode;
}

export function DashboardCard({
    title,
    subtitle,
    icon: Icon,
    iconColorClass,
    onClick,
    children,
    headerBadge,
    footer,
}: DashboardCardProps) {
    return (
        <div
            onClick={onClick}
            className="group inline-flex h-fit w-full max-w-md cursor-pointer flex-col overflow-hidden rounded-lg border border-border bg-surface p-5 transition-shadow hover:shadow-md"
        >
            <div className="mb-6 flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className={`rounded-md p-2.5 ${iconColorClass}`}>
                        <Icon size={22} strokeWidth={1.75} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold tracking-tight text-ink">
                            {title}
                        </h3>
                        {subtitle && (
                            <p className="text-xs font-medium text-ink-muted">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>
                {headerBadge || (
                    <ArrowRight
                        className="text-ink-subtle transition-all group-hover:translate-x-1 group-hover:text-ink"
                        size={20}
                        strokeWidth={1.75}
                    />
                )}
            </div>

            <div className="flex-grow space-y-4">{children}</div>

            {footer && (
                <div className="mt-4 border-t border-border pt-2">{footer}</div>
            )}
        </div>
    );
}

export function CardSlider({
    label,
    current,
    target,
    colorClass = "bg-accent",
    size = "md", // "sm" | "md" | "lg"
}: {
    label?: string;
    current: number;
    target: number;
    colorClass?: string;
    size?: "sm" | "md" | "lg";
}) {
    const percent = Math.min((current / target) * 100, 100);
    const height = size === "sm" ? "h-1" : size === "lg" ? "h-4" : "h-2";

    return (
        <div className="w-full">
            {label && (
                <div className="mb-1 flex justify-between text-[11px] font-medium text-ink-subtle">
                    <span>{label}</span>
                    <span>
                        {current}/{target}
                    </span>
                </div>
            )}
            <div
                className={`w-full bg-surface-sunken ${height} overflow-hidden rounded-full`}
            >
                <div
                    className={`${colorClass} h-full transition-all duration-1000 ease-out`}
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    );
}

// A flexible stat badge
export function CardStat({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: string | number;
    icon?: LucideIcon;
}) {
    return (
        <div className="flex flex-col">
            <span className="text-[11px] font-medium text-ink-subtle">
                {label}
            </span>
            <div className="flex items-center gap-1 font-semibold text-ink">
                {Icon && (
                    <Icon
                        size={12}
                        strokeWidth={1.75}
                        className="text-ink-subtle"
                    />
                )}
                {value}
            </div>
        </div>
    );
}
