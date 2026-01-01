import { z } from 'zod';


// base simple schemas for raw data
const MetricSchema = z.object({
  goal: z.number(),
  value: z.number().default(0), // Defaults to 0 so you don't have to initialize it manually
  unit: z.string(),          // e.g., "reps", "minutes", "meters"
});

// sets is an additional dimension
export const ExerciseMetricsSchema = MetricSchema.extend({
  sets: z.number().optional(),
})

export type ExerciseMetrics = z.infer<typeof ExerciseMetricsSchema>


// all possible exercises are much harder to define, so let it be a catchall
export const ExerciseCategoriesSchema = z.object()
  .catchall(ExerciseMetricsSchema)

// nutrition
export const MacrosSchema = z.object({
  calories: MetricSchema.optional(),
  protein: MetricSchema.optional(),
  carbs: MetricSchema.optional(),
  fats: MetricSchema.optional(),
  fiber: MetricSchema.optional(),
  sugar: MetricSchema.optional(),
});
export type Macros = z.infer<typeof MacrosSchema>;

export const FatsDetailSchema = z.object({
  saturatedFat: MetricSchema.optional(),
  unsaturatedFat: MetricSchema.optional(),
  transFat: MetricSchema.optional(),
  cholesterol: MetricSchema.optional(),
});
export type FatsDetail = z.infer<typeof FatsDetailSchema>;

export const MineralsSchema = z.object({
  sodium: MetricSchema.optional(),
  potassium: MetricSchema.optional(),
  magnesium: MetricSchema.optional(),
  calcium: MetricSchema.optional(),
  iron: MetricSchema.optional(),
  zinc: MetricSchema.optional(),
});
export type Minerals = z.infer<typeof MineralsSchema>;

export const VitaminsSchema = z.object({
  vitaminA: MetricSchema.optional(),
  vitaminC: MetricSchema.optional(),
  vitaminD: MetricSchema.optional(),
  vitaminB12: MetricSchema.optional(),
  folate: MetricSchema.optional(),
});
export type Vitamins = z.infer<typeof VitaminsSchema>;

export const HydrationSchema = z.object({
  water: MetricSchema.optional(),
});
export type Hydration = z.infer<typeof HydrationSchema>;


const MacroPlanSchema = z.object({
  id: z.string(),
  meta: z.object({
    type: z.literal("macros"),
    importance: z.string().optional(),
    name: z.string().optional(),
  }),
  data: MacrosSchema.strict(),
});

const MineralPlanSchema = z.object({
  id: z.string(),
  meta: z.object({
    type: z.literal("minerals"),
  }),
  data: MineralsSchema.strict(), 
});

const FatsDetailPlanSchema = z.object({
  id: z.string(),
  meta: z.object({
    type: z.literal("minerals"),
  }),
  data: MineralsSchema.strict(), 
});

const VitaminPlanSchema = z.object({
  id: z.string(),
  meta: z.object({
    type: z.literal("vitamins"),
  }),
  data: VitaminsSchema.strict(),
});

export const HydrationPlanSchema = z.object({
  id: z.string(),
  meta: z.object({
    type: z.literal("hydration"),
  }),
  data: HydrationSchema.strict(),
});


export const ExercisePlanSchema = z.object({
  id: z.string(),
  meta: z.object({
    name: z.string(),
    intensity: z.enum(['blue', 'orange', 'red']),
    precaution: z.string().optional(),
  }),
  data: ExerciseCategoriesSchema
});
export type ExercisePlan = z.infer<typeof ExercisePlanSchema>;

export const ExerciseProgressSchema = z.object({
  id: z.string(),
  moduleId: z.string(),
  summary: z.string().optional().nullable(),
  trackables: z.array(ExercisePlanSchema),
});
export type ExerciseProgress = z.infer<typeof ExerciseProgressSchema>;

export const ExerciseModuleBlueprintSchema = z.object({  // for LLM use
  summary: z.string().optional(),
  plan: z.array(ExercisePlanSchema),
});
export type ExerciseModuleBlueprint = z.infer<typeof ExerciseModuleBlueprintSchema>;

export const ExerciseModuleSchema = ExerciseModuleBlueprintSchema.extend({
  id: z.string(),
  stateId: z.string(),
  progress: ExerciseProgressSchema.optional().nullable()  // technically we shouldnt do this, but i am too lazy
  // to change prisma yet again atp
});
export type ExerciseModule = z.infer<typeof ExerciseModuleSchema>;


//  master discriminated Union
export const NutritionPlanSchema = z.union([
  MacroPlanSchema,
  MineralPlanSchema,
  VitaminPlanSchema,
  FatsDetailPlanSchema,
  HydrationPlanSchema,
]);
export type NutritionPlan = z.infer<typeof NutritionPlanSchema>

export const NutritionChecklistSchema = z.object({
  id: z.string(),
  name: z.string(),
  impact: z.record(z.string(), z.number()), 
  metadata: z.object({
    message: z.string().optional(),
    timing: z.string().optional(),
  }).optional(),
});
export type NutritionChecklist = z.infer<typeof NutritionChecklistSchema>;

export const NutritionProgressSchema = z.object({
  id: z.string(),
  moduleId: z.string(),
  summary: z.string().optional().nullable(),
  trackables: z.array(NutritionPlanSchema),
  checklistState: z.record(z.string(), z.boolean()).default({}),
});

export type NutritionProgress = z.infer<typeof NutritionProgressSchema>;

export const NutritionModuleBlueprintSchema = z.object({
  summary: z.string().optional(),
  plan: z.array(NutritionPlanSchema),
  checklists: z.array(NutritionChecklistSchema).default([]),
});
export type NutritionModuleBlueprint = z.infer<typeof NutritionModuleBlueprintSchema>;

export const NutritionModuleSchema = NutritionModuleBlueprintSchema.extend({
  id: z.string(),
  stateId: z.string(),
  progress: NutritionProgressSchema.optional().nullable()
});
export type NutritionModule = z.infer<typeof NutritionModuleSchema>;





export const StateBlueprintSchema = z.object({
  exercise: ExerciseModuleBlueprintSchema,
  nutrition: NutritionModuleBlueprintSchema,
});
export type StateBlueprint = z.infer<typeof StateBlueprintSchema>;

export const StateSchema = z.object({
  id: z.string(),
  userId: z.string(),
  dateCreated: z.coerce.date(),
  exercise: ExerciseModuleSchema,
  nutrition: NutritionModuleSchema,
});
export type State = z.infer<typeof StateSchema>;




