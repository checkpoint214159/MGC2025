"use server"

import { generateObject } from 'ai';
import { BaseQuestionSchema, type BaseQuestion } from '@/lib/llm/schemas/base';
import { Thread } from '@/lib/external/schemas/thread';

import { getModel } from "@/lib/llm/model";
import { Biometrics } from "@/lib/user/schema";
import { Baseline } from "@/lib/user/baseline";

const SYSTEM_PROMPT = `
### IDENTITY
You are a Senior Care Architect specializing in Post-Operative Context Discovery. Your objective is to map the "Hidden Recovery Environment"—the social, environmental, and lifestyle factors that clinical baselines miss.

### THE DISCOVERY MISSION
You are investigating the "Social Determinants of Recovery." Biometrics and pain scores are already handled. You are looking for:
1. **Physical Environment:** Home layout (stairs, elevators), bathroom accessibility, local climate/living conditions in Singapore (e.g., proximity to HDB amenities).
2. **Social Capital:** Actual support at home (who is cooking/cleaning?), caregiver reliability, living alone status.
3. **Lifestyle Logistics:** Nutritional preferences (Asian/Western diets, halal/vegetarian), work-from-home vs. manual labor, sleep hygiene.
4. **Cultural/Psychological:** Recovery expectations, anxiety levels, and motivation.

### OPERATIONAL GUIDELINES
- **Be a "Warm Human":** Use conversational openings like "Looking at your home..." or "When it comes to meals..."
- **Conciseness (Strict):** Max 15 words per question. 
- **Non-Technical:** Never use ICF codes or medical jargon (e.g., say "getting around the house" instead of "mobility").
- **Avoid Repetition:** Do not ask about pain, symptoms, or anything already covered in the biometrics.
- **Single Question:** One question per turn. Never "double-barrel."

### NEGATIVE CONSTRAINTS (DO NOT)
- DO NOT ask about pain levels or surgical site appearance.
- DO NOT use the word "Axis" or "Pillar."
- DO NOT ask the same category twice unless a follow-up is vital for safety.
- DO NOT offer medical advice.

### RESPONSE FORMAT
Output ONLY a valid JSON object following the BaseQuestion schema.
`;


export async function getInitialLLMQuestion(biometrics: Biometrics, baseline: Baseline): Promise<BaseQuestion> {
    const { object } = await generateObject({
        model: getModel(),
        schema: BaseQuestionSchema,
        schemaName: 'BaseQuestion',
        system: SYSTEM_PROMPT,
        prompt: `
        USER CONTEXT:
        Treatment: ${biometrics.treatment}
        Age: ${biometrics.age}
        Sex: ${biometrics.sex}
        Existing pre-op baselines: ${JSON.stringify(baseline, null, 2)}
        MISSION: Start the holistic discovery. Based on a ${biometrics.treatment}, identify the single most critical 'environmental' blind spot (e.g., home layout or social support) and ask a warm, introductory question.
        `,
    });

    return object as BaseQuestion;
}

export async function getNextLLMQuestion(biometrics: any, thread: Thread, baseline: Baseline): Promise<BaseQuestion> {
    
    const questionCount = thread.messages?.filter(m => m.role === 'assistant').length || 0;

  // generateObject waits for the full response and validates it
    const { object } = await generateObject({
        model: getModel(), 
        schema: BaseQuestionSchema,      // This is your Zod schema!
        schemaName: 'BaseQuestion',      // Optional: helps the LLM understand the context
        schemaDescription: 'A structured question for patient onboarding',
        system: SYSTEM_PROMPT,
        prompt: `
        CURRENT QUESTION COUNT: ${questionCount} of 5.
        User Biometrics: ${JSON.stringify(biometrics, null, 2)}
        User Pre-op baseline: ${JSON.stringify(baseline, null, 2)}
        Conversation History: ${JSON.stringify(thread.messages, null, 2)}
        
        Provide the next logical question in the assessment.
        If you have enough information to understand their safety and general mobility, 
        or if you have reached the last question, you MUST use "terminateQuestioning".
        `,
    });
    // console.log('PROMPT??', `
    //     CURRENT QUESTION COUNT: ${questionCount} of 5.
    //     User Biometrics: ${JSON.stringify(biometrics)}
    //     Conversation History: ${JSON.stringify(thread.messages)}
        
    //     Provide the next logical question in the assessment.
    //     If you have enough information to understand their safety and general mobility, 
    //     or if you have reached the last question, you MUST use "terminateQuestioning".
    //     `,)
    // console.log('system prompt?', SYSTEM_PROMPT)
    // console.log('bio???', biometrics)
    // console.log('nextqnllm', object)
  return object; 
}
