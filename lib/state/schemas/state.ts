import { z } from 'zod';
import { ExerciseModuleSchema, ExerciseModuleBlueprintSchema } from './exercise';
import { NutritionModuleSchema, NutritionModuleBlueprintSchema } from './nutrition';
import { SleepModuleSchema, SleepModuleBlueprintSchema } from './sleep';
import { SymptomModuleSchema, SymptomModuleBlueprintSchema } from './symptoms';


export const StateBlueprintSchema = z.object({
  exercise: ExerciseModuleBlueprintSchema,
  nutrition: NutritionModuleBlueprintSchema,
  sleep: SleepModuleBlueprintSchema.optional(),
  symptoms: SymptomModuleBlueprintSchema.optional(),
});
export type StateBlueprint = z.infer<typeof StateBlueprintSchema>;

export const StateSchema = z.object({
  id: z.string(),
  userId: z.string(),
  dateCreated: z.coerce.date(),
  exercise: ExerciseModuleSchema,
  nutrition: NutritionModuleSchema,
  sleep: SleepModuleSchema.optional(),
  symptoms: SymptomModuleSchema.optional(),
});
export type State = z.infer<typeof StateSchema>;
