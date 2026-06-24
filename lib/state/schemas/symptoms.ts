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

export const SymptomMetricSchema = BaseMetricObj.extend({
    // We don't "aim" for symptoms, so we fix the goal to 0
    goal: z.literal(0).default(0),

    // Value represents severity here (e.g., 0-10 scale)
    value: z
        .number()
        .min(0)
        .max(10)
        .describe("Severity score where 0 is none and 10 is emergency"),

    unit: z.literal("level").default("level"),

    // New specific fields for symptoms
    location: z
        .string()
        .describe(
            "Where the symptom is felt (e.g., 'Lower Back', 'Left Knee')",
        ),
    type: z.enum(["pain", "stiffness", "swelling", "numbness", "fatigue"]),
    frequency: z.enum(["constant", "intermittent", "only_during_exercise"]),
});

export const SymptomCategoriesSchema = z
    .object({
        pain: SymptomMetricSchema.optional().describe(
            "Primary daily pain score (0-10); drives the recovery arc and stagnation flag",
        ),
    })
    .catchall(SymptomMetricSchema);

export const SymptomMetaSchema = BaseMetaObj;

export const SymptomPlanSchema = createPlanSchema({
    dataSchema: SymptomCategoriesSchema,
    metaSchema: SymptomMetaSchema,
});

export const SymptomProgressSchema = createProgressSchema({
    planSchema: SymptomPlanSchema,
});

export const SymptomModuleBlueprintSchema = createModuleBlueprintSchema({
    type: "symptoms",
    planSchema: SymptomPlanSchema,
    checklistSchema: BaseChecklistObj,
});

export const SymptomModuleSchema = createModuleSchema({
    blueprintSchema: SymptomModuleBlueprintSchema,
    progressSchema: SymptomProgressSchema,
});

export type SymptomMetric = z.infer<typeof SymptomMetricSchema>;
export type SymptomCategories = z.infer<typeof SymptomCategoriesSchema>;
export type SymptomPlan = z.infer<typeof SymptomPlanSchema>;
export type SymptomProgress = z.infer<typeof SymptomProgressSchema>;
export type SymptomModuleBlueprint = z.infer<
    typeof SymptomModuleBlueprintSchema
>;
export type SymptomModule = z.infer<typeof SymptomModuleSchema>;
