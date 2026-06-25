"use client";

import { ReactNode } from "react";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shared nav shell that links the MGC mockup screens into one demo flow. */
const STEPS = [
    { key: "S1", href: "/preview/mgc/onboarding", label: "Onboard" },
    { key: "S2", href: "/preview/mgc/plan", label: "Plan" },
    { key: "S3", href: "/preview/mgc/verify", label: "Verify" },
    { key: "S4", href: "/preview/mgc/patient", label: "Dashboard" },
    { key: "S7", href: "/preview/mgc/admin", label: "Monitor" },
];

export function MgcShell({
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
                        href="/preview/mgc"
                        className="flex shrink-0 items-center gap-2"
                    >
                        <span className="grid size-7 place-items-center rounded-md bg-accent text-[13px] font-semibold text-ink-inverse">
                            R
                        </span>
                        <span className="text-[14px] font-semibold text-ink">
                            Recovery
                        </span>
                        <span className="rounded bg-attention-soft px-1.5 py-0.5 text-[11px] text-attention-ink">
                            MGC mockup
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
                        <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />
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
                    </nav>
                </div>
            </header>
            <main>{children}</main>
        </div>
    );
}
