// Semantic theme map for module sub-types.
// Colors are CSS tokens (defined in app/globals.css), not raw values.

export const INTENSITY_THEMES = {
    blue: {
        chipClass: "bg-accent-soft text-accent-ink",
        barColor: "var(--accent)",
        label: "Encouraged",
        icon: "•",
        showPrecaution: false,
    },
    orange: {
        chipClass: "bg-attention-soft text-attention-ink",
        barColor: "var(--attention)",
        label: "Cautious",
        icon: "!",
        showPrecaution: true,
    },
    red: {
        chipClass: "bg-critical-soft text-critical-ink",
        barColor: "var(--critical)",
        label: "Pause if pain",
        icon: "!!",
        showPrecaution: true,
    },
} as const;

export type Intensity = keyof typeof INTENSITY_THEMES;

// Kept as data tags for nutrition sub-categories. No emoji.
export const NUTRITION_THEMES = {
    macros: { label: "Macros", chipClass: "bg-accent-soft text-accent-ink" },
    minerals: {
        label: "Minerals",
        chipClass: "bg-progress-soft text-progress-ink",
    },
    vitamins: {
        label: "Vitamins",
        chipClass: "bg-attention-soft text-attention-ink",
    },
    hydration: {
        label: "Hydration",
        chipClass: "bg-accent-soft text-accent-ink",
    },
    fats: { label: "Fats", chipClass: "bg-surface-sunken text-ink-muted" },
    default: { label: "Other", chipClass: "bg-surface-sunken text-ink-muted" },
} as const;
