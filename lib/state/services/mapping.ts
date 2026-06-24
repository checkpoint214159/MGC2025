import { ExerciseModuleBlueprintSchema } from "@/lib/state/schemas/exercise";
import { NutritionModuleBlueprintSchema } from "@/lib/state/schemas/nutrition";
import { SleepModuleBlueprintSchema } from "@/lib/state/schemas/sleep";
import { SymptomModuleBlueprintSchema } from "@/lib/state/schemas/symptoms";
import z from "zod";

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
    roleSpecificPrompt: string;
}

export const MODULE_REGISTRY: Record<string, ModuleDefinition> = {
    exercise: {
        schema: ExerciseModuleBlueprintSchema,
        roleSpecificPrompt: `
    You are a Senior Physiotherapist. Create a specific exercise plan tailored to
    the individual patient. Clearly define goals.
    `,
    },
    nutrition: {
        schema: NutritionModuleBlueprintSchema,
        roleSpecificPrompt: `
    You are a Clinical Dietitian. Create a high-protein recovery nutrition plan
    focusing on tissue repair and energy management.

    Create a checklist of food items, providing their impact to the macros (e.g Food item A has 200 calories, 40g protein, etc)
    `,
    },
    sleep: {
        schema: SleepModuleBlueprintSchema,
        roleSpecificPrompt: `
    You are a Sleep & Recovery specialist. Define a simple daily sleep target
    (hours, with an optional quality rating) appropriate to the patient's surgery
    and stage of recovery. Keep it to one "duration" metric.
    `,
    },
    symptoms: {
        schema: SymptomModuleBlueprintSchema,
        roleSpecificPrompt: `
    You are a Post-Op Monitoring specialist. Define the key symptoms to track daily.
    ALWAYS include a "pain" metric (0-10 severity, with a body location) plus any
    procedure-specific symptoms (stiffness, swelling, etc.). These are tracked, not
    targeted — keep goal at 0; the patient logs their current severity each day.
    `,
    },
};

// Static system prompt that's identical across ALL calls (patient-agnostic).
// Cache-stable, reused across patients and regenerations.
const STATIC_SYSTEM_PROMPT = `
ROLE: You are a Senior Clinical Rehabilitation Specialist.
TASK: Generate a "Recovery Blueprint" (JSON) for a patient based on their History Snapshot.

INPUT DATA:
- CONVERSATION SNAPSHOT: This is a frozen record of recent patient interactions.
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
${FORMAT_PROTOCOL}
`;

export function getModuleBlueprint(moduleKey: string) {
    const config = MODULE_REGISTRY[moduleKey];
    return {
        schema: config.schema,
        staticSystemPrompt: STATIC_SYSTEM_PROMPT,
        roleSpecificPrompt: config.roleSpecificPrompt,
    };
}
