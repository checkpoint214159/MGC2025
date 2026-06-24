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

export const SleepMetricSchema = BaseMetricObj.extend({
    unit: z.literal("hours").default("hours"),
    quality: z.enum(["poor", "fair", "good", "excellent"]).optional(),
    goal: z.number().min(0).max(24),
});

export const SleepCategoriesSchema = z
    .object({
        duration: SleepMetricSchema.optional().describe(
            "Hours of sleep, with an optional quality rating",
        ),
    })
    .catchall(SleepMetricSchema);

export const SleepMetaSchema = BaseMetaObj;

export const SleepPlanSchema = createPlanSchema({
    dataSchema: SleepCategoriesSchema,
    metaSchema: SleepMetaSchema,
});

export const SleepProgressSchema = createProgressSchema({
    planSchema: SleepPlanSchema,
});

export const SleepModuleBlueprintSchema = createModuleBlueprintSchema({
    type: "sleep",
    planSchema: SleepPlanSchema,
    checklistSchema: BaseChecklistObj,
});

export const SleepModuleSchema = createModuleSchema({
    blueprintSchema: SleepModuleBlueprintSchema,
    progressSchema: SleepProgressSchema,
});

export type SleepMetric = z.infer<typeof SleepMetricSchema>;
export type SleepCategories = z.infer<typeof SleepCategoriesSchema>;
export type SleepPlan = z.infer<typeof SleepPlanSchema>;
export type SleepProgress = z.infer<typeof SleepProgressSchema>;
export type SleepModuleBlueprint = z.infer<typeof SleepModuleBlueprintSchema>;
export type SleepModule = z.infer<typeof SleepModuleSchema>;
