import { z } from 'zod';
import {
    BaseMetricObj,
    BaseMetaObj,
    createPlanSchema,
    createProgressSchema,
    createModuleBlueprintSchema,
    createModuleSchema,
} from '@/lib/state/schemas/base';

// Note: We don't use createCategoriesSchema here because these are fixed, not catchall.
// They still satisfy AnyCategoriesData because they map strings to BaseMetric.

export const MacrosSchema = z.object({
    calories: BaseMetricObj.optional(),
    protein: BaseMetricObj.optional(),
    carbs: BaseMetricObj.optional(),
    fats: BaseMetricObj.optional(),
    fiber: BaseMetricObj.optional(),
    sugar: BaseMetricObj.optional(),
});

export const FatsDetailSchema = z.object({
    saturatedFat: BaseMetricObj.optional(),
    unsaturatedFat: BaseMetricObj.optional(),
    transFat: BaseMetricObj.optional(),
    cholesterol: BaseMetricObj.optional(),
});

export const MineralsSchema = z.object({
    sodium: BaseMetricObj.optional(),
    potassium: BaseMetricObj.optional(),
    magnesium: BaseMetricObj.optional(),
    calcium: BaseMetricObj.optional(),
    iron: BaseMetricObj.optional(),
    zinc: BaseMetricObj.optional(),
});

export const VitaminsSchema = z.object({
    vitaminA: BaseMetricObj.optional(),
    vitaminC: BaseMetricObj.optional(),
    vitaminD: BaseMetricObj.optional(),
    vitaminB12: BaseMetricObj.optional(),
    folate: BaseMetricObj.optional(),
});

export const HydrationSchema = z.object({
    water: BaseMetricObj.optional(),
});


export const MacroPlanSchema = createPlanSchema({
    dataSchema: MacrosSchema.strict(),
    metaSchema: BaseMetaObj.extend({
        type: z.literal("macros"),
        importance: z.string().optional(),
    })
});

export const MineralPlanSchema = createPlanSchema({
    dataSchema: MineralsSchema.strict(),
    metaSchema: BaseMetaObj.extend({ type: z.literal("minerals") })
});

export const FatsDetailPlanSchema = createPlanSchema({
    dataSchema: FatsDetailSchema.strict(),
    metaSchema: BaseMetaObj.extend({ type: z.literal("fats") })
});

export const VitaminPlanSchema = createPlanSchema({
    dataSchema: VitaminsSchema.strict(),
    metaSchema: BaseMetaObj.extend({ type: z.literal("vitamins") })
});

export const HydrationPlanSchema = createPlanSchema({
    dataSchema: HydrationSchema.strict(),
    metaSchema: BaseMetaObj.extend({ type: z.literal("hydration") })
});


export const NutritionPlanSchema = z.union([
    MacroPlanSchema,
    MineralPlanSchema,
    VitaminPlanSchema,
    FatsDetailPlanSchema,
    HydrationPlanSchema,
]);

export const NutritionChecklistSchema = z.object({
    id: z.string(),
    name: z.string(),
    impact: z.record(z.string(), z.number()),
    metadata: z.object({
        message: z.string().optional(),
        timing: z.string().optional(),
    }).optional(),
});


export const NutritionProgressSchema = createProgressSchema({
    planSchema: NutritionPlanSchema,
}).extend({
    checklistState: z.record(z.string(), z.boolean()).default({}),
});

export const NutritionModuleBlueprintSchema = createModuleBlueprintSchema({
    planSchema: NutritionPlanSchema,
}).extend({
    checklists: z.array(NutritionChecklistSchema).default([]),
});

export const NutritionModuleSchema = createModuleSchema({
    blueprintSchema: NutritionModuleBlueprintSchema,
    progressSchema: NutritionProgressSchema,
});


export type Macros = z.infer<typeof MacrosSchema>;
export type NutritionPlan = z.infer<typeof NutritionPlanSchema>;
export type NutritionChecklist = z.infer<typeof NutritionChecklistSchema>;
export type NutritionProgress = z.infer<typeof NutritionProgressSchema>;
export type NutritionModuleBlueprint = z.infer<typeof NutritionModuleBlueprintSchema>;
export type NutritionModule = z.infer<typeof NutritionModuleSchema>;