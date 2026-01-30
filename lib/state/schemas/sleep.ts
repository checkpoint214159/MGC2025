import { z } from 'zod';
import {
    BaseMetricObj,
    BaseMetaObj,
    createPlanSchema,
    createProgressSchema,
    createModuleBlueprintSchema,
    createModuleSchema,
    BaseChecklistObj,
} from '@/lib/state/schemas/base';

export const SleepMetricSchema = BaseMetricObj.extend({
  unit: z.literal("hours").default("hours"),
  quality: z.enum(["poor", "fair", "good", "excellent"]).optional(),
  goal: z.number().min(0).max(24),
});