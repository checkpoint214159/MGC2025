import RecoveryExercise from "@/components/ui/RecoveryExercise";
import NutritionPlan from "@/components/ui/NutritionPlan";

export interface WidgetConfig {
  id: string;
  type: string;
  props: any;
}

export const COMPONENT_REGISTRY: Record<string, React.ElementType> = {
  EXERCISE_TRACKER: RecoveryExercise,
  NUTRITION_PLAN: NutritionPlan,
  // ADD_MORE: YourNextComponent
};

export const ROUTE_MAP: Record<string, string> = {
  EXERCISE_TRACKER: "/recovery/fitness",
  NUTRITION_PLAN: "/recovery/diet",
  SYMPTOM_CHECKER: "/recovery/symptoms",
};
