"use server";

import { generateObject, type ModelMessage } from "ai";
import { BaseQuestionSchema, type BaseQuestion } from "@/lib/llm/schemas/base";
import { Thread } from "@/lib/external/schemas/thread";

import { getModel } from "@/lib/llm/model";
import { Biometrics } from "@/lib/user/schema";

// A prompt-cache breakpoint for OpenRouter. The provider (@openrouter/ai-sdk-provider)
// reads providerOptions.openrouter.cacheControl and emits Anthropic `cache_control` on
// that message, caching the byte-exact prefix UP TO AND INCLUDING it. We place these on
// stable blocks (system + biometrics, and the latest committed turn) so the volatile
// instruction that follows never poisons the cached prefix.
const CACHE_BREAKPOINT = {
    openrouter: { cacheControl: { type: "ephemeral" as const } },
};

// Stable per session (biometrics don't change mid-onboarding) → belongs in the cached
// prefix, ahead of the breakpoint, never in the volatile tail.
function biometricContext(b: {
    treatment?: string;
    age?: number;
    sex?: string;
}): string {
    return `### PATIENT CONTEXT\nTreatment: ${b?.treatment}\nAge: ${b?.age}\nSex: ${b?.sex}`;
}

const SYSTEM_PROMPT = `
### IDENTITY
You are a Senior Care Architect specializing in Post-Operative Lifestyle Discovery. Your objective is to map the "Hidden Recovery Environment"—the social, environmental, and lifestyle factors that clinical data misses.

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

// Stable instruction + patient block, cached as one prefix and reused across every
// question in the session. Volatile mission text goes in a separate user turn after it.
function systemMessage(biometrics: {
    treatment?: string;
    age?: number;
    sex?: string;
}): ModelMessage {
    return {
        role: "system",
        content: `${SYSTEM_PROMPT}\n\n${biometricContext(biometrics)}`,
        providerOptions: CACHE_BREAKPOINT,
    };
}

export async function getInitialLLMQuestion(
    biometrics: Biometrics,
): Promise<BaseQuestion> {
    const { object } = await generateObject({
        model: getModel(),
        schema: BaseQuestionSchema,
        schemaName: "BaseQuestion",
        messages: [
            systemMessage(biometrics),
            {
                role: "user",
                content:
                    "Start the holistic lifestyle discovery. Identify the single most critical environmental blind spot (e.g. home layout or social support) and ask a warm, introductory question.",
            },
        ],
    });

    return object as BaseQuestion;
}

export async function getNextLLMQuestion(
    biometrics: any,
    thread: Thread,
): Promise<BaseQuestion> {
    const questionCount =
        thread.messages?.filter((m) => m.role === "assistant").length || 0;

    // Conversation so far as real messages. Append-only, so this prefix is byte-stable
    // across turns — we put a second cache breakpoint on the latest committed turn so the
    // accumulated history is cached too (it crosses the model's min-cache size as it grows).
    const history: ModelMessage[] = (thread.messages ?? [])
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
        }));

    if (history.length > 0) {
        const last = history[history.length - 1];
        history[history.length - 1] = {
            ...last,
            providerOptions: CACHE_BREAKPOINT,
        } as ModelMessage;
    }

    const { object } = await generateObject({
        model: getModel(),
        schema: BaseQuestionSchema,
        schemaName: "BaseQuestion",
        schemaDescription: "A structured question for patient onboarding",
        messages: [
            systemMessage(biometrics),
            ...history,
            {
                // Volatile tail (changes every turn) — kept AFTER the breakpoints so it
                // never invalidates the cached prefix.
                role: "user",
                content: `You have asked ${questionCount} of 5 questions so far. Provide the next logical lifestyle question. If you have enough information about their lifestyle, home environment and social support, or you have reached the last question, you MUST use "terminateQuestioning".`,
            },
        ],
    });

    return object;
}
