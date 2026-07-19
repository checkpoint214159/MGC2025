"use client";

import { ReactNode } from "react";
import { LayoutGrid, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shared nav shell linking the Wally patient-journey mockups + out to the clinician screens. */
const STEPS = [
    { key: "onboarding", href: "/preview/wally/onboarding", label: "Onboard" },
    { key: "assessment", href: "/preview/wally/assessment", label: "Assess" },
    {
        key: "lifestyle",
        href: "/preview/wally/lifestyle",
        label: "Preferences",
    },
    { key: "discharge", href: "/preview/wally/discharge", label: "Upload" },
    { key: "review", href: "/preview/wally/review", label: "Review" },
    { key: "plan", href: "/preview/wally/plan", label: "Plan" },
    { key: "dashboard", href: "/preview/wally/dashboard", label: "Dashboard" },
    { key: "report", href: "/preview/wally/report", label: "Report" },
];

export function WallyShell({
    active,
    children,
}: {
    active?: string;
    children: ReactNode;
}) {
    return (
        <div className="min-h-screen bg-bg">
            <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur">
                <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-2.5">
                    <a
                        href="/preview/wally"
                        className="flex shrink-0 items-center gap-2"
                    >
                        <span className="grid size-7 place-items-center rounded-md bg-accent text-[13px] font-semibold text-ink-inverse">
                            W
                        </span>
                        <span className="text-[14px] font-semibold text-ink">
                            Wally
                        </span>
                    </a>
                    <nav className="flex items-center gap-1 overflow-x-auto">
                        <a
                            href="/preview"
                            className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-[13px] font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink"
                        >
                            <LayoutGrid size={15} strokeWidth={1.75} />
                            All pages
                        </a>
                        <span
                            className="mx-0.5 h-5 w-px bg-border"
                            aria-hidden
                        />
                        {STEPS.map((s, i) => (
                            <a
                                key={s.key}
                                href={s.href}
                                className={cn(
                                    "flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-[13px] font-medium",
                                    active === s.key
                                        ? "bg-accent-soft text-accent-ink"
                                        : "text-ink-muted hover:bg-surface-sunken hover:text-ink",
                                )}
                            >
                                <span className="text-ink-subtle">{i + 1}</span>
                                {s.label}
                            </a>
                        ))}
                        <span
                            className="mx-0.5 h-5 w-px bg-border"
                            aria-hidden
                        />
                        <a
                            href="/preview/mgc/admin"
                            className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-[13px] font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink"
                            title="Clinician monitoring (existing)"
                        >
                            <Stethoscope size={15} strokeWidth={1.75} />
                            Clinician
                        </a>
                    </nav>
                </div>
            </header>
            <main>{children}</main>
        </div>
    );
}
