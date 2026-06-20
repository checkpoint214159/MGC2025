import { State } from "@/lib/state/schemas/state";
import { ExerciseModule, ExercisePlan, ExerciseMetrics } from "@/lib/state/schemas/exercise";
import { NutritionModule, NutritionPlan } from "@/lib/state/schemas/nutrition";

type Macro = { goal?: number; value?: number } | undefined;
type Macros = Partial<Record<"calories" | "protein" | "carbs" | "fats", Macro>>;

export type RecoveryPhase = "early" | "re-engagement" | "late";

export function getRecoveryDay(opts: { surgeryDate?: Date | null; today: Date }): number | null {
  if (!opts.surgeryDate) return null;
  const ms = opts.today.getTime() - opts.surgeryDate.getTime();
  return Math.max(1, Math.floor(ms / (1000 * 60 * 60 * 24)) + 1);
}

export function getRecoveryPhase(day: number | null): RecoveryPhase {
  if (day === null) return "early";
  if (day <= 9) return "early";
  if (day <= 14) return "re-engagement";
  return "late";
}

// Patient-facing labels: plain and warm, never clinical jargon. The cohort is
// older cancer patients — "re-engagement window" means nothing to them.
export function getPhaseLabel(phase: RecoveryPhase): string {
  switch (phase) {
    case "early": return "Early days";
    case "re-engagement": return "Two weeks in";
    case "late": return "Further along";
  }
}

export type Priority = {
  id: string;
  moduleType: "exercise" | "nutrition";
  title: string;
  context: string;
  isComplete: boolean;
  intensity?: "blue" | "orange" | "red";
  href: string;
};

function exercisePriorities(mod: ExerciseModule): Priority[] {
  if (!mod.plan?.length) return [];
  return mod.plan.map((p: ExercisePlan) => {
    const trackable = mod.progress?.trackables.find(t => t.id === p.id);
    const planMetrics = Object.values(p.data ?? {}) as ExerciseMetrics[];
    const progressMetrics = trackable ? (Object.values(trackable.data ?? {}) as ExerciseMetrics[]) : [];
    const totalGoal = planMetrics.reduce((s, m) => s + (m?.goal ?? 0), 0);
    const totalValue = progressMetrics.reduce((s, m) => s + (m?.value ?? 0), 0);
    const isComplete = totalGoal > 0 && totalValue >= totalGoal;
    return {
      id: p.id,
      moduleType: "exercise" as const,
      title: p.meta?.name ?? "Exercise",
      context: totalGoal > 0
        ? `${Math.min(totalValue, totalGoal)}/${totalGoal} done`
        : "Today's movement",
      isComplete,
      intensity: p.meta?.intensity,
      href: "/recovery/exercise",
    };
  });
}

function nutritionPriorities(mod: NutritionModule): Priority[] {
  if (!mod.plan?.length) return [];
  const macroPlan = mod.plan.find((p: NutritionPlan) => p.meta?.type === "macros") as NutritionPlan | undefined;
  if (!macroPlan) return [];
  const trackable = mod.progress?.trackables.find(t => t.id === macroPlan.id);
  const planData = (macroPlan.data ?? {}) as Macros;
  const progData = (trackable?.data ?? {}) as Macros;
  const goalCalories = planData.calories?.goal ?? 0;
  const valCalories = progData.calories?.value ?? 0;
  const proteinGoal = planData.protein?.goal ?? 0;
  const proteinVal = progData.protein?.value ?? 0;

  const items: Priority[] = [];
  if (goalCalories > 0) {
    items.push({
      id: `${macroPlan.id}-calories`,
      moduleType: "nutrition",
      title: "Hit your calorie target",
      context: `${Math.round(valCalories)} / ${Math.round(goalCalories)} kcal`,
      isComplete: valCalories >= goalCalories,
      href: "/recovery/nutrition",
    });
  }
  if (proteinGoal > 0) {
    items.push({
      id: `${macroPlan.id}-protein`,
      moduleType: "nutrition",
      title: "Get your protein in",
      context: `${Math.round(proteinVal)} / ${Math.round(proteinGoal)} g — for tissue repair`,
      isComplete: proteinVal >= proteinGoal,
      href: "/recovery/nutrition",
    });
  }
  return items;
}

export function getTopPriorities(state: State | null | undefined, count = 3): Priority[] {
  if (!state) return [];
  const all: Priority[] = [];
  for (const m of state.modules) {
    if (m.type === "exercise") all.push(...exercisePriorities(m));
    if (m.type === "nutrition") all.push(...nutritionPriorities(m));
  }
  return all
    .sort((a, b) => {
      if (a.isComplete !== b.isComplete) return a.isComplete ? 1 : -1;
      const rank: Record<string, number> = { red: 0, orange: 1, blue: 2 };
      const ra = a.intensity ? rank[a.intensity] : 3;
      const rb = b.intensity ? rank[b.intensity] : 3;
      return ra - rb;
    })
    .slice(0, count);
}

export type WeekRhythm = { completed: number; total: 7; todayIndex: number };

export function getWeekRhythm(state: State | null | undefined, today: Date): WeekRhythm {
  const todayIndex = (today.getDay() + 6) % 7;
  if (!state) return { completed: 0, total: 7, todayIndex };
  const priorities = getTopPriorities(state, 10);
  const todayDone = priorities.length > 0 && priorities.every(p => p.isComplete);
  return { completed: todayDone ? todayIndex + 1 : todayIndex, total: 7, todayIndex };
}

export * from "./streak";
export * from "./baseline";
export * from "./nudge";
export * from "./caregiver";
export * from "./arc";
