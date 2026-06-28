"use client";

import { CSSProperties, ReactNode } from "react";

/**
 * Wraps a subtree and locally remaps the accent design tokens to a phase colour, so
 * every primitive inside (Button → bg-accent, accent Chip, focus ring, links) inherits
 * the phase hue with no per-component edits. Solids are deepened where needed so white
 * button labels clear WCAG AA; soft/ink come from the matching semantic ramp.
 */
export type Phase = "onboarding" | "assessment" | "lifestyle" | "neutral";

const VARS: Record<Phase, Record<string, string>> = {
    // blue — the app's default accent (already AA)
    onboarding: {
        "--accent": "oklch(0.53 0.105 255)",
        "--accent-hover": "oklch(0.46 0.11 255)",
        "--accent-soft": "oklch(0.886 0.028 245)",
        "--accent-ink": "oklch(0.40 0.10 255)",
        "--ring": "oklch(0.657 0.085 255 / 0.4)",
    },
    // green — from the --progress ramp, solid deepened for white labels
    assessment: {
        "--accent": "oklch(0.50 0.11 155)",
        "--accent-hover": "oklch(0.43 0.11 155)",
        "--accent-soft": "oklch(0.92 0.045 150)",
        "--accent-ink": "oklch(0.36 0.08 155)",
        "--ring": "oklch(0.50 0.11 155 / 0.4)",
    },
    // amber — from the --attention ramp, solid as a deep bronze for white labels
    lifestyle: {
        "--accent": "oklch(0.52 0.11 65)",
        "--accent-hover": "oklch(0.45 0.11 65)",
        "--accent-soft": "oklch(0.93 0.05 80)",
        "--accent-ink": "oklch(0.42 0.09 70)",
        "--ring": "oklch(0.52 0.11 65 / 0.4)",
    },
    neutral: {},
};

export function PhaseScope({
    phase,
    children,
    className,
}: {
    phase: Phase;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={className} style={VARS[phase] as CSSProperties}>
            {children}
        </div>
    );
}
