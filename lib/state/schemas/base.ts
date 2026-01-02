// define base types and schema builders, more re-usable across many components

import { z } from 'zod';

export const BaseMetricObj = z.object({
  goal: z.number(),
  value: z.number().default(0), // Defaults to 0 so you don't have to initialize it manually
  unit: z.string(),          // e.g., "reps", "minutes", "meters"
});

export type BaseMetric = z.infer<typeof BaseMetricObj>

export const BaseMetaObj = z.object({
  type: z.string(),
  name: z.string().optional(),
});

export type BaseMeta = z.infer<typeof BaseMetaObj>



export type AnyCategoriesData = Record<string, BaseMetric>;

export interface AnyPlanData {
  id: string;
  meta: BaseMeta;
  data: AnyCategoriesData;
  [key: string]: any;
}

export interface AnyProgressData {
  id: string;
  moduleId: string;
  summary?: string | null;
  trackables: AnyPlanData[];
}

export interface AnyModuleBlueprintData {
  summary?: string | null;
  plan: AnyPlanData[];
}



// schema building functions

export function createCategoriesSchema<T extends z.ZodType<BaseMetric>>({
  metricSchema,
}: {
  metricSchema: T;
}) {
  return z.object({}).catchall(metricSchema);
}

export function createPlanSchema<
  D extends z.ZodType<AnyCategoriesData>,
  M extends z.ZodType<BaseMeta>,
  E extends z.ZodRawShape = {}
>({
  dataSchema,
  metaSchema,
  extras = {} as E,
}: {
  dataSchema: D;
  metaSchema: M;
  extras?: E;
}) {
  return z.object({
    id: z.string(),
    meta: metaSchema,
    data: dataSchema,
    ...extras,
  });
}

export function createProgressSchema<P extends z.ZodType<AnyPlanData>>({
  planSchema,
}: {
  planSchema: P;
}) {
  return z.object({
    id: z.string(),
    moduleId: z.string(),
    summary: z.string().optional().nullable(),
    trackables: z.array(planSchema),
  });
}

export function createModuleBlueprintSchema<P extends z.ZodType<AnyPlanData>>({
  planSchema,
}: {
  planSchema: P;
}) {
  return z.object({
    summary: z.string().optional().nullable(),
    plan: z.array(planSchema),
  });
}

/**
 * Use z.ZodObject here to allow the use of .extend() 
 * and .optional() without complex generic errors.
 */

export function createModuleSchema<
  B extends z.ZodObject, 
  P extends z.ZodObject
>({
  blueprintSchema,
  progressSchema,
}: {
  blueprintSchema: B;
  progressSchema: P;
}) {
  const schema = blueprintSchema.extend({
    id: z.string(),
    stateId: z.string(),
    progress: progressSchema.optional().nullable(),
  });

  // casting is required as blueprintSchema is a z.ZodObject
  // we haphazardly made
  return schema as z.ZodObject<
    B["shape"] & {
      id: z.ZodString;
      stateId: z.ZodString;
      progress: z.ZodNullable<z.ZodOptional<P>>;
    }
  >;
}