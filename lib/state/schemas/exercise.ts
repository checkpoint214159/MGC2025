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

export const ExerciseMetaSchema = BaseMetaObj.extend({
    intensity: z.enum(['blue', 'orange', 'red']),
    precaution: z.string().optional(),
})

export const ExerciseCategoriesSchema = createCategoriesSchema({
    metricSchema: ExerciseMetricsSchema
})

export const ExercisePlanSchema = createPlanSchema({
    dataSchema: ExerciseCategoriesSchema,
    metaSchema: ExerciseMetaSchema
})

export const ExerciseProgressSchema = createProgressSchema({
    planSchema: ExercisePlanSchema
})

export const ExerciseModuleBlueprintSchema = createModuleBlueprintSchema({
    type: "EXERCISE",
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


