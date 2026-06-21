import { z } from 'zod';
import { ExerciseModuleSchema, ExerciseModuleBlueprintSchema } from './exercise';
import { NutritionModuleSchema, NutritionModuleBlueprintSchema } from './nutrition';
import { SleepModuleSchema, SleepModuleBlueprintSchema } from './sleep';
import { SymptomModuleSchema, SymptomModuleBlueprintSchema } from './symptoms';


export const ModuleSchema = z.discriminatedUnion("type", [
  ExerciseModuleSchema,
  NutritionModuleSchema,
  SleepModuleSchema,
  SymptomModuleSchema,
])

export const PlanStatusSchema = z.enum(["draft", "verified", "active", "archived"]);
export type PlanStatus = z.infer<typeof PlanStatusSchema>;

export const LLMBlueprintSchema = z.object({
  exercise: ExerciseModuleBlueprintSchema,
  nutrition: NutritionModuleBlueprintSchema,
  sleep: SleepModuleBlueprintSchema.optional(),
  symptoms: SymptomModuleBlueprintSchema.optional(),
})

export const StateSchema = z.object({
  id: z.string(),
  userId: z.string(),
  dateCreated: z.coerce.date(),

  // recovery plan / arc fields (the anchor state carries the X-day arc + lifecycle)
  recoveryDays: z.number().int().optional().nullable(),
  status: PlanStatusSchema.optional().default("active"),
  confidence: z.number().optional().nullable(),
  isAnchor: z.boolean().optional().default(false),
  anchorStateId: z.string().optional().nullable(),

  causalStateId: z.string().optional().nullable(),
  causalXId: z.string().optional().nullable(),
  nextStateId: z.string().optional().nullable(),

  modules: z.array(ModuleSchema).default([]),
});

export type State = z.infer<typeof StateSchema>;
export type LLMBlueprint = z.infer<typeof LLMBlueprintSchema>
