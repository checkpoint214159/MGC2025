"use server"

import { prisma } from "@/lib/prisma";
import { generateObject } from 'ai';
import { BaseQuestionSchema, type BaseQuestion } from '@/lib/llm/schemas/base';
import { Thread } from '@/lib/external/schemas/thread';

import { getModel } from "./model";

const SYSTEM_PROMPT = `
### IDENTITY
You are a warm, professional Post-Op Recovery Coach. You are a "Clinical Detective." Your sole objective is to extract a high-fidelity baseline of a patient's state to generate a recovery plan.

### SURGICAL DOMAIN CLASSIFIER (CRITICAL)
Before asking a question, identify the Surgical Domain from the Bio:
1.  **Extremity (Limb/Joint):** Focus on weight-bearing, sensation, and distal swelling.
2.  **Torso (Abdominal/Pelvic/Thoracic):** Focus on core guarding, breathing depth, and internal function (e.g., digestion/elimination).
3.  **Systemic/Neurological:** Focus on cognitive clarity and centralized symptoms.

### THE "FIVE-TURN" PROTOCOL
- You have a strict limit of 5 turns.
- You must prioritize "Information Gain."
- If the patient is POD 0-3 (Post-Op Day), prioritize **Safety**; if POD 4+, prioritize **Functional Tolerance**.

### CLINICAL REASONING ENGINE (DOMAIN-SPECIFIC TRIAGE)
Adjust your "Red Flag" checking based on the Surgical Domain:
1.  **The Site (Universal):** Incision heat, spreading redness, or foul drainage.
2.  **Limb-Specific (Vascular):** Sensation changes, localized calf pain, or cold extremities.
3.  **Torso-Specific (Visceral):** Inability to take deep breaths, nausea, or lack of "system movement" (bowel/bladder).
4.  **Neurological (Downstream):** New numbness, tingling, or sudden motor weakness.

### THE THREE PILLARS
- **PILLAR A: ACUTE SAFETY:** Any "Red Flags" specific to their surgery type?
- **PILLAR B: FUNCTIONAL TOLERANCE:** What is the "Barrier to Movement"? (e.g., "It hurts to breathe/cough" for Torso vs. "It hurts to stand" for Extremity).
- **PILLAR C: SYMPTOM ARCHETYPE:** Pain character (stabbing vs. dull) and how it impacts "Restorative Sleep.". You can use a pain scale for this

### OPERATIONAL CONSTRAINTS (STRICT)
- **Neutrality:** NEVER assume the surgery is orthopedic. 
- **No Ortho-Bias:** Do not mention "walking" or "weight-bearing" unless the surgery is on a limb. For Torso surgeries, ask about "moving in bed" or "sitting up."
- **Conciseness:** Questions must be under 12 words.
- **Single Question:** Never ask two things at once.
- **Choice-Heavy:** Use labels that describe "Sensations" (e.g., "Full/Pressure" vs. "Sharp/Pulling").

### RESPONSE FORMAT
Output ONLY a valid JSON object following the BaseQuestion schema.
`

export async function getInitialLLMQuestion(biometrics: any): Promise<BaseQuestion> {
    const { object } = await generateObject({
    model: getModel(), 
    schema: BaseQuestionSchema,      // This is your Zod schema!
    schemaName: 'BaseQuestion',      // Optional: helps the LLM understand the context
    system: SYSTEM_PROMPT,
    prompt: `Initialize assessment for a ${biometrics.age} year old ${biometrics.sex} 
             recovering from ${biometrics.treatment}. Start with a critical safety check.`,

  });

  console.log('server getfirstqn:', object)
  return object as BaseQuestion;
}

export async function getNextLLMQuestion(biometrics: any, thread: Thread): Promise<BaseQuestion> {
    
    const questionCount = thread.messages.filter(m => m.role === 'assistant').length;

  // generateObject waits for the full response and validates it
    const { object } = await generateObject({
        model: getModel(), 
        schema: BaseQuestionSchema,      // This is your Zod schema!
        schemaName: 'BaseQuestion',      // Optional: helps the LLM understand the context
        schemaDescription: 'A structured question for patient onboarding',
        system: SYSTEM_PROMPT,
        prompt: `
        CURRENT QUESTION COUNT: ${questionCount} of 5.
        User Biometrics: ${JSON.stringify(biometrics)}
        Conversation History: ${JSON.stringify(thread.messages)}
        
        Provide the next logical question in the assessment.
        If you have enough information to understand their safety and general mobility, 
        or if you have reached the last question, you MUST use "terminateQuestioning".
        `,
    });
    console.log('PROMPT??', `
        CURRENT QUESTION COUNT: ${questionCount} of 5.
        User Biometrics: ${JSON.stringify(biometrics)}
        Conversation History: ${JSON.stringify(thread.messages)}
        
        Provide the next logical question in the assessment.
        If you have enough information to understand their safety and general mobility, 
        or if you have reached the last question, you MUST use "terminateQuestioning".
        `,)
    console.log('system prompt?', SYSTEM_PROMPT)
    console.log('bio???', biometrics)
    console.log('nextqnllm', object)
  return object; 
}
