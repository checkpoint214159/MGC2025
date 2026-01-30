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


export const SymptomMetricSchema = BaseMetricObj.extend({
  // We don't "aim" for symptoms, so we fix the goal to 0
  goal: z.literal(0).default(0),
  
  // Value represents severity here (e.g., 0-10 scale)
  value: z.number().min(0).max(10).describe("Severity score where 0 is none and 10 is emergency"),
  
  unit: z.literal("level").default("level"),

  // New specific fields for symptoms
  location: z.string().describe("Where the symptom is felt (e.g., 'Lower Back', 'Left Knee')"),
  type: z.enum(["pain", "stiffness", "swelling", "numbness", "fatigue"]),
  frequency: z.enum(["constant", "intermittent", "only_during_exercise"])
});