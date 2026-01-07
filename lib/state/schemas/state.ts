import { z } from 'zod';
import { ExerciseModuleSchema, ExerciseModuleBlueprintSchema } from './exercise';
import { NutritionModuleSchema, NutritionModuleBlueprintSchema } from './nutrition';


export const StateBlueprintSchema = z.object({
  exercise: ExerciseModuleBlueprintSchema,
  nutrition: NutritionModuleBlueprintSchema,
});
export type StateBlueprint = z.infer<typeof StateBlueprintSchema>;

export const StateSchema = z.object({
  id: z.string(),
  userId: z.string(),
  dateCreated: z.coerce.date(),

  causalStateId: z.string().optional(),
  causalXId: z.string().optional(),
  nextStateId: z.string().optional(),

  exercise: ExerciseModuleSchema,
  nutrition: NutritionModuleSchema,
});
export type State = z.infer<typeof StateSchema>;




