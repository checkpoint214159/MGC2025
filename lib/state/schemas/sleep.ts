import { z } from 'zod';
import {
    BaseMetricObj,
    BaseMetaObj,
    createPlanSchema,
    createProgressSchema,
    createModuleBlueprintSchema,
    createModuleSchema,
} from '@/lib/state/schemas/base';

export const SleepDataSchema = z.object({
    hoursSlept: BaseMetricObj,
    sleepQuality: BaseMetricObj,
    disturbances: BaseMetricObj,
});

export const SleepMetaSchema = BaseMetaObj.extend({
    type: z.literal("sleep"),
});

export const SleepPlanSchema = createPlanSchema({
    dataSchema: SleepDataSchema,
    metaSchema: SleepMetaSchema,
});

export const SleepProgressSchema = createProgressSchema({
    planSchema: SleepPlanSchema,
});

export const SleepModuleBlueprintSchema = createModuleBlueprintSchema({
    planSchema: SleepPlanSchema,
});

export const SleepModuleSchema = createModuleSchema({
    blueprintSchema: SleepModuleBlueprintSchema,
    progressSchema: SleepProgressSchema,
});

export type SleepData = z.infer<typeof SleepDataSchema>;
export type SleepPlan = z.infer<typeof SleepPlanSchema>;
export type SleepProgress = z.infer<typeof SleepProgressSchema>;
export type SleepModuleBlueprint = z.infer<typeof SleepModuleBlueprintSchema>;
export type SleepModule = z.infer<typeof SleepModuleSchema>;
