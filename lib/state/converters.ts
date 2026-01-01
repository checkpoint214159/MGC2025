import { 
  ExercisePlan,
  NutritionPlan, NutritionChecklist,
  NutritionModule,
  State
} from "./schema";

export function createInitialProgress(plan: (ExercisePlan | NutritionPlan)[]): any {
  return plan.map(part => {
      const rawMetrics = part.data;

      if (!rawMetrics) {
        return { ...part, data: {} };
      }

      const zeroedMetrics = Object.fromEntries(
        Object.entries(rawMetrics).map(([key, metric]) => {
          if (typeof metric === 'object' && metric !== null && 'goal' in metric) {
            return [
              key,
              { 
                ...metric, 
                value: 0 // reset user progress
              }
            ];
          }
          return [key, metric];
        })
      );

      return {
        ...part,
        data: zeroedMetrics
      };
    })
}

export function createInitialChecklistState(checklists: NutritionChecklist[]): Record<string, boolean> {
  return Object.fromEntries(checklists.map((cl) => [cl.id, false]));
}

// /** Extracts the lean Trackable from an Exercise Plan */
// export function toExerciseTrackable(task: ExercisePlan): ExerciseTrackable {
//   return {
//     id: task.id,
//     trackable: task.trackable,
//   };
// }

// /** Extracts the lean Trackable from a Nutrition Plan */
// export function toNutritionTrackable(task: NutritionPlan): NutritionTrackable {
//   return {
//     id: task.id,
//     trackable: task.trackable,
//   };
// }

// // --- TRACKER + STATE -> STATE (Rehydration) ---

// /** Merges a lean Exercise Trackable back into a full Exercise Plan */
// export function mergeExercisePlan(task: ExercisePlan, tracker: ExerciseTracker): ExercisePlan {
//   const found = tracker.trackables.find((t) => t.id === task.id);
//   return {
//     ...task,
//     trackable: found ? found.trackable : task.trackable,
//   };
// }

// /** Merges a lean Nutrition Trackable back into a full Nutrition Plan */
// export function mergeNutritionPlan(task: NutritionPlan, tracker: NutritionTracker): NutritionPlan {
//   const found = tracker.trackables.find((t) => t.id === task.id);
//   return {
//     ...task,
//     trackable: found ? found.trackable : task.trackable,
//   };
// }


// // --- STATE -> TRACKER ---

// export function toExerciseTracker(mod: ExerciseModule): ExerciseTracker {
//   return {
//     summary: mod.summary,
//     trackables: mod.tasks.map(toExerciseTrackable),
//   };
// }

// export function toNutritionTracker(mod: NutritionModule): NutritionTracker {
//   return {
//     summary: mod.summary,
//     trackables: mod.tasks.map(toNutritionTrackable),
//     checklists: mod.checklists?.map(cl => ({ ...cl })),
//   };
// }

// // --- TRACKER + STATE -> STATE ---

// export function mergeExerciseModule(mod: ExerciseModule, tracker: ExerciseTracker): ExerciseModule {
//   return {
//     ...mod,
//     summary: tracker.summary || mod.summary,
//     tasks: mod.tasks.map((task) => mergeExercisePlan(task, tracker)),
//   };
// }

// export function mergeNutritionModule(mod: NutritionModule, tracker: NutritionTracker): NutritionModule {
//   return {
//     ...mod,
//     summary: tracker.summary || mod.summary,
//     tasks: mod.tasks.map((task) => mergeNutritionPlan(task, tracker)),
//     checklists: mod.checklists, // Checklists remain static blueprint items in State
//   };
// }
