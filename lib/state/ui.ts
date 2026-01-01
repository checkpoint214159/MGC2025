export const INTENSITY_THEMES = {
  blue: {
    container: "border-blue-100",
    badge: "bg-blue-50 text-blue-600 border-blue-200",
    icon: "✨",
    precautionBg: "bg-blue-50/50",
    precautionText: "text-blue-700",
    showPrecaution: false,
    barColor: "#3b82f6", // blue-500
  },
  orange: {
    container: "border-orange-100",
    badge: "bg-orange-50 text-orange-700 border-orange-200",
    icon: "⚠️",
    precautionBg: "bg-orange-50/50",
    precautionText: "text-orange-800",
    showPrecaution: true,
    barColor: "#f59e0b", // amber-500
  },
  red: {
    container: "border-red-100",
    badge: "bg-red-50 text-red-700 border-red-200",
    icon: "🛑",
    precautionBg: "bg-red-50",
    precautionText: "text-red-900 font-medium",
    showPrecaution: true,
    barColor: "#ef4444", // red-500
  },
} as const;

export type Intensity = keyof typeof INTENSITY_THEMES;


export const NUTRITION_THEMES = {
  macros: { icon: "🥩", color: "text-orange-600", bg: "bg-orange-50" },
  minerals: { icon: "🧂", color: "text-blue-600", bg: "bg-blue-50" },
  vitamins: { icon: "💊", color: "text-purple-600", bg: "bg-purple-50" },
  hydration: { icon: "💧", color: "text-cyan-600", bg: "bg-cyan-50" },
  default: { icon: "🍽️", color: "text-slate-600", bg: "bg-slate-50" }
} as const;

