"use client";

import { ReactNode } from "react";

/** Shared, on-token shell for the auth surfaces so login and signup stay consistent. */
export const authInputClass =
    "h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-[16px] text-ink placeholder:text-ink-subtle";

export function AuthShell({
    title,
    subtitle,
    error,
    children,
    footer,
}: {
    title: string;
    subtitle: string;
    error?: string;
    children: ReactNode;
    footer: ReactNode;
}) {
    return (
        <div className="grid min-h-screen place-items-center bg-bg px-5 py-12">
            <div className="w-full max-w-md">
                <div className="mb-6 flex items-center justify-center gap-2.5">
                    <div className="grid size-9 place-items-center rounded-lg bg-accent text-[16px] font-semibold text-ink-inverse">
                        R
                    </div>
                    <span className="text-[17px] font-semibold text-ink">
                        Recovery
                    </span>
                </div>

                <div className="rounded-xl border border-border bg-surface p-7 shadow-sm md:p-8">
                    <h1 className="text-[26px] font-semibold text-ink">
                        {title}
                    </h1>
                    <p className="mt-1 text-[15px] text-ink-muted">
                        {subtitle}
                    </p>

                    {error && (
                        <p
                            role="alert"
                            className="mt-5 rounded-md bg-critical-soft px-3 py-2.5 text-[14px] text-critical-ink"
                        >
                            {error}
                        </p>
                    )}

                    {children}
                </div>

                <p className="mt-5 text-center text-[14px] text-ink-muted">
                    {footer}
                </p>
            </div>
        </div>
    );
}

export function Field({
    label,
    htmlFor,
    children,
}: {
    label: string;
    htmlFor: string;
    children: ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <label
                htmlFor={htmlFor}
                className="block text-[14px] font-medium text-ink"
            >
                {label}
            </label>
            {children}
        </div>
    );
}
