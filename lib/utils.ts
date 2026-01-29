import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { NutritionModule } from "./state/schemas/nutrition"
import { ExerciseModule } from "./state/schemas/exercise"
import { State } from "@/lib/state/schemas/state"

interface ModuleRegistry {
  exercise: ExerciseModule,
  nutrition: NutritionModule,
}

export function getModuleFromState<K extends keyof ModuleRegistry>(
  state: State | null | undefined,
  type: K
): ModuleRegistry[K] | null {
  if (!state) return null;
  
  const module = state.modules.find((m) => m.type === type);
  return (module as any) || null;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function ensureAction<T>(result: { success: boolean; data?: T; error?: string }): T {
    if (!result.success || result.data === undefined) {
        throw new Error(result.error || "Action failed");
    }
    return result.data;
}