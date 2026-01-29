import { ExerciseModuleBlueprintSchema } from '@/lib/state/schemas/exercise';
import { NutritionModuleBlueprintSchema } from '@/lib/state/schemas/nutrition';
import { Schema, zodSchema } from 'ai';
import z from 'zod';

export const FORMAT_PROTOCOL = `
STRICT JSON PROTOCOL:
1. Your output must be VALID JSON that matches the provided schema EXACTLY.
2. DO NOT include any markdown formatting (no \`\`\`json blocks).
3. DO NOT include introductory text or explanations.
4. If a field is required by the schema but you lack specific data, provide a safe, clinically-sound default.
5. DATA PERSISTENCE: The 'data' field is non-negotiable. It MUST contain at least one metric key.
`;

export interface ModuleDefinition {
  schema: z.ZodObject;
  systemPrompt: string;
}

export const MODULE_REGISTRY: Record<string, ModuleDefinition> = {
  exercise: {
    schema: ExerciseModuleBlueprintSchema,
    systemPrompt: `
    You are a Senior Physiotherapist. Create a specific exercise plan tailored to
    the individual patient. Clearly define goals.
    `,
  },
  nutrition: {
    schema: NutritionModuleBlueprintSchema,
    systemPrompt: `
    You are a Clinical Dietitian. Create a high-protein recovery nutrition plan 
    focusing on tissue repair and energy management.

    Create a checklist of food items, providing their impact to the macros (e.g Food item A has 200 calories, 40g protein, etc)
    `,
  },
};

export function getModuleBlueprint(
    moduleKey: string,
    profile: string,
) {
    const config = MODULE_REGISTRY[moduleKey]
    const dynamicSysPrompt = 
    `
    ROLE: You are a Senior Clinical Rehabilitation Specialist.
    TASK: Generate a "Recovery Blueprint" (JSON) for a patient based on their History Snapshot.

    INPUT DATA:
    1. PATIENT PROFILE: ${profile}
    2. CONVERSATION SNAPSHOT: This is a frozen record of recent patient interactions. 
       Analyze these for:
       - Reported pain levels or physical limitations.
       - Nutritional preferences or adherence issues.
       - Direct requests from the patient or doctor.

     OUTPUT INSTRUCTIONS:
    - Your goal is to output a "Blueprint" containing exactly 1-3 modules.
    - Each module must match the specific schema for NUTRITION, EXERCISE, etc.

    STRICT CONSTRAINTS:
    - Do NOT generate IDs or timestamps (these are system-managed).
    - Return ONLY valid JSON matching the provided schema.
    `

    return {
        schema: config.schema,
        systemPrompt: dynamicSysPrompt
    }
}