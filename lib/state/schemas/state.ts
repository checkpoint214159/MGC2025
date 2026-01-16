import { z } from 'zod';
import { ExerciseModuleSchema, ExerciseModuleBlueprintSchema } from './exercise';
import { NutritionModuleSchema, NutritionModuleBlueprintSchema } from './nutrition';


export const ModuleSchema = z.discriminatedUnion("type", [
  ExerciseModuleSchema,
  NutritionModuleSchema,
])

export const LLMBlueprintSchema = z.object({
  exercise: ExerciseModuleBlueprintSchema,
  nutrition: NutritionModuleBlueprintSchema
})

export const StateSchema = z.object({
  id: z.string(),
  userId: z.string(),
  dateCreated: z.coerce.date(),

  causalStateId: z.string().optional(),
  causalXId: z.string().optional(),
  nextStateId: z.string().optional(),

  modules: z.array(ModuleSchema).default([]),
});

export type State = z.infer<typeof StateSchema>;
export type LLMBlueprint = z.infer<typeof LLMBlueprintSchema>



