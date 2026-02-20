import { z } from 'zod';
import {
    BaseMetricObj,
    BaseMetaObj,
    createCategoriesSchema,
    createPlanSchema,
    createProgressSchema,
    createModuleBlueprintSchema,
    createModuleSchema,
    BaseChecklistObj,
} from '@/lib/state/schemas/base'


export const ExerciseMetricsSchema = BaseMetricObj.extend({
    sets: z.number().optional(),
})

export const ExerciseCategoriesSchema = z.object({
    // Strength / Resistance
    resistance: ExerciseMetricsSchema.optional()
        .describe("For weight-bearing or strength moves (e.g., reps, sets, load)"),
    
    // Mobility / Flexibility 
    mobility: ExerciseMetricsSchema.optional()
        .describe("For stretching or ROM (e.g., hold time, repetitions)"),
    
    // Cardiovascular / Aerobic
    aerobic: ExerciseMetricsSchema.optional()
        .describe("For endurance (e.g., duration, distance, heart rate)"),
    
    // Neuromuscular / Balance
    stability: ExerciseMetricsSchema.optional()
        .describe("For balance and coordination (e.g., sets, time per side)"),
})
.catchall(ExerciseMetricsSchema)

export const ExerciseMetaSchema = BaseMetaObj.extend({
    intensity: z.enum(['blue', 'orange', 'red']),
    precaution: z.string().optional(),
})

export const ExercisePlanSchema = createPlanSchema({
    dataSchema: ExerciseCategoriesSchema,
    metaSchema: ExerciseMetaSchema
})

export const ExerciseProgressSchema = createProgressSchema({
    planSchema: ExercisePlanSchema
})

export const ExerciseModuleBlueprintSchema = createModuleBlueprintSchema({
    type: "exercise",
    planSchema: ExercisePlanSchema,
    checklistSchema: BaseChecklistObj,
})

export const ExerciseModuleSchema = createModuleSchema({
    blueprintSchema: ExerciseModuleBlueprintSchema,
    progressSchema: ExerciseProgressSchema,
})


export type ExerciseMetrics = z.infer<typeof ExerciseMetricsSchema>
export type ExerciseMeta = z.infer<typeof ExerciseMetaSchema>
export type ExerciseCategories = z.infer<typeof ExerciseCategoriesSchema>
export type ExercisePlan = z.infer<typeof ExercisePlanSchema>
export type ExerciseProgress = z.infer<typeof ExerciseProgressSchema>
export type ExerciseModuleBlueprint = z.infer<typeof ExerciseModuleBlueprintSchema>
export type ExerciseModule = z.infer<typeof ExerciseModuleSchema>


