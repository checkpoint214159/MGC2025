import Exercises from "@/components/ui/ExercisePreviewCard";
// import NutritionWidget from "@/components/ui/NutritionWidget";

export interface DashboardConfig {
  modules: {
    exercise?: {
      summary: string;
      tasks: Array<{
        id: string;
        name: string;
        reps: string;
        frequency: string;
        precaution: string;
        intensity: "blue" | "orange" | "red";
      }>;
    };
    nutrition?: {
      title: string;
      goalCalories: number;
      macros: {
        protein: { target: number; unit: string; label: string };
        carbs: { target: number; unit: string; label: string };
        fats: { target: number; unit: string; label: string };
      };
      micros: Array<{ name: string; target: number; unit: string; importance: string }>;
      checklists: Array<{ id: string; name: string; calories: number }>;
    };
    symptoms?: {
      emergencyProtocol: string;
      dailyChecks: Array<{ id: string; label: string; critical: boolean }>;
    };
  };
}

// export const COMPONENT_REGISTRY: Record<string, React.ElementType> = {
//   EXERCISE_TRACKER: RecoveryExercise,
//   // NUTRITION_PLAN: NutritionWidget,
//   // ADD_MORE: YourNextComponent
// };

// export const ROUTE_MAP: Record<string, string> = {
//   EXERCISE_TRACKER: "/recovery/fitness",
//   NUTRITION_PLAN: "/recovery/diet",
//   SYMPTOM_CHECKER: "/recovery/symptoms",
// };
