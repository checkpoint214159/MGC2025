import { z } from 'zod';

export const SymptomCheckItemSchema = z.object({
    id: z.string(),
    label: z.string(),
    critical: z.boolean(),
    response: z.boolean().nullable().default(null),
});

export const SymptomLogEntrySchema = z.object({
    id: z.string(),
    site: z.string(),
    description: z.string(),
    intensity: z.number().min(0).max(10),
    timestamp: z.string(),
});

export const SymptomPeriodSchema = z.object({
    checklist: z.array(SymptomCheckItemSchema),
    logs: z.array(SymptomLogEntrySchema).default([]),
    completed: z.boolean().default(false),
});

export const SymptomModuleBlueprintSchema = z.object({
    summary: z.string().nullable().optional(),
    emergencyProtocol: z.string(),
    checklist: z.array(SymptomCheckItemSchema),
});

export const SymptomProgressSchema = z.object({
    id: z.string(),
    moduleId: z.string(),
    morning: SymptomPeriodSchema,
    evening: SymptomPeriodSchema,
});

export const SymptomModuleSchema = z.object({
    id: z.string(),
    stateId: z.string(),
    summary: z.string().nullable().optional(),
    emergencyProtocol: z.string(),
    checklist: z.array(SymptomCheckItemSchema),
    progress: SymptomProgressSchema.nullable().optional(),
});

export type SymptomCheckItem = z.infer<typeof SymptomCheckItemSchema>;
export type SymptomLogEntry = z.infer<typeof SymptomLogEntrySchema>;
export type SymptomPeriod = z.infer<typeof SymptomPeriodSchema>;
export type SymptomModuleBlueprint = z.infer<typeof SymptomModuleBlueprintSchema>;
export type SymptomProgress = z.infer<typeof SymptomProgressSchema>;
export type SymptomModule = z.infer<typeof SymptomModuleSchema>;
