import { z } from "zod";
import {
    BaseMetricObj,
    BaseMetaObj,
    createPlanSchema,
    createProgressSchema,
    createModuleBlueprintSchema,
    createModuleSchema,
    BaseChecklistObj,
} from "@/lib/state/schemas/base";

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
    }),
});

export const MineralPlanSchema = createPlanSchema({
    dataSchema: MineralsSchema.strict(),
    metaSchema: BaseMetaObj.extend({ type: z.literal("minerals") }),
});

export const FatsDetailPlanSchema = createPlanSchema({
    dataSchema: FatsDetailSchema.strict(),
    metaSchema: BaseMetaObj.extend({ type: z.literal("fats") }),
});

export const VitaminPlanSchema = createPlanSchema({
    dataSchema: VitaminsSchema.strict(),
    metaSchema: BaseMetaObj.extend({ type: z.literal("vitamins") }),
});

export const HydrationPlanSchema = createPlanSchema({
    dataSchema: HydrationSchema.strict(),
    metaSchema: BaseMetaObj.extend({ type: z.literal("hydration") }),
});

// Only the categories the dashboard actually renders (macros → calories/protein, and
// hydration). The mineral/vitamin/fat branches are defined above but kept OUT of the
// union: Anthropic's structured output caps optional params at 24, and all 5 branches
// together produced 32 (it sums optionals across every union branch). Re-add a branch
// here once there's UI consuming it — each adds ~5-7 optionals to the budget.
export const NutritionPlanSchema = z.union([
    MacroPlanSchema,
    HydrationPlanSchema,
    // MineralPlanSchema,    // +7 optionals
    // VitaminPlanSchema,    // +6 optionals
    // FatsDetailPlanSchema, // +5 optionals
]);

export const NutritionChecklistSchema = BaseChecklistObj.extend({
    progress_impact: z
        .record(z.string(), z.number())
        .describe("The amount contributed to each specific nutrient"),
    metadata: z
        .object({
            message: z.string().optional(),
            timing: z.string().optional(),
        })
        .optional(),
});

export const NutritionProgressSchema = createProgressSchema({
    planSchema: NutritionPlanSchema,
});

export const NutritionModuleBlueprintSchema = createModuleBlueprintSchema({
    type: "nutrition",
    planSchema: NutritionPlanSchema,
    checklistSchema: NutritionChecklistSchema,
});

export const NutritionModuleSchema = createModuleSchema({
    blueprintSchema: NutritionModuleBlueprintSchema,
    progressSchema: NutritionProgressSchema,
});

export type Macros = z.infer<typeof MacrosSchema>;
export type NutritionPlan = z.infer<typeof NutritionPlanSchema>;
export type NutritionChecklist = z.infer<typeof NutritionChecklistSchema>;
export type NutritionProgress = z.infer<typeof NutritionProgressSchema>;
export type NutritionModuleBlueprint = z.infer<
    typeof NutritionModuleBlueprintSchema
>;
export type NutritionModule = z.infer<typeof NutritionModuleSchema>;
