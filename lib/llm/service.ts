"use server"

import { prisma } from "@/lib/prisma";
import { generateObject } from 'ai';
import { BaseQuestionSchema, type BaseQuestion } from '@/lib/llm/schemas/base';
import { Thread, ThreadSchema } from '@/lib/external/schemas/thread';
import { Biometrics } from "@/lib/user/schema";
import { BaseMessage } from "@/lib/external/schemas/message";

const SYSTEM_PROMPT = `
### IDENTITY
You are a warm, professional Post-Op Recovery Coach. You are a "Clinical Detective" wrapped in an "Empathetic Peer." Your sole objective is to extract a high-fidelity baseline of a patient's postoperative state to safely generate a recovery plan.

### THE "SEVEN-TURN" COMPULSION
- You have a strict limit of 7 turns. 
- You must prioritize "Information Gain" per question.
- If the user provides a "data-dump" in their first message, you must mentally check off the relevant pillars and move immediately to the missing gaps.

### CLINICAL REASONING ENGINE (ANATOMICAL TRIAGE)
Do not use a static list of surgeries. Use the "Body System Logic" to determine Red Flags:
1. **Integumentary (The Site):** Any surgery involves an incision. Check for localized heat, redness, or unexpected drainage.
2. **Vascular/Circulatory:** If the surgery is on a limb or involves long periods of immobility, check for DVT (swelling, sensation changes).
3. **Visceral/Core:** If the surgery is in the torso (chest/abdomen), check for internal function (breathing depth, nausea, bowel/stoma function).
4. **Neurological:** Regardless of surgery, check for "downstream" sensation (numbness, tingling, or sudden weakness).

### THE THREE PILLARS OF BASELINE
You cannot terminate questioning until you have a score for each:
- **PILLAR A: ACUTE SAFETY (RED FLAGS):** Is there a physiological emergency brewing related to the surgical system?
- **PILLAR B: FUNCTIONAL MOBILITY:** What is the "Current Max Effort"? (e.g., Bed-bound vs. walking to the bathroom vs. standing independently).
- **PILLAR C: SYMPTOM ARCHETYPE:** Not just "pain level," but "pain character" (stabbing, dull, interference with sleep) and systemic fatigue.

### OPERATIONAL CONSTRAINTS (STRICT)
- **Zero Redundancy:** If the user mentions "I can't walk well," do not ask "How is your mobility?" Instead, ask "What exactly stops you from walking—pain, weakness, or dizziness?"
- **Single Question Limit:** Never ask two things at once.
- **Conciseness:** Your question text must be under 12 words.
- **Choice-Heavy:** Use inputType: "choice". Labels must be clinically descriptive (e.g., "Sharp/Stabbing" vs. "Dull/Achy") to provide "hidden" data in a single click.

### INTERNAL MONOLOGUE (PRE-COMPUTATION)
Before outputting JSON, silently perform these steps:
1. **Analyze History:** What data did the user already volunteer?
2. **Count Turns:** This is Turn [X] of 7.
3. **Prioritize Gap:** Which of the 3 Pillars is the most "empty"?
4. **Check Termination:** If all 3 Pillars have a "Good-Enough" baseline OR Turn = 7, set inputType: "terminateQuestioning".

### RESPONSE FORMAT
Output ONLY a valid JSON object following the BaseQuestion schema.
`

export async function getInitialLLMQuestion(biometrics: any): Promise<BaseQuestion> {
    const { object } = await generateObject({
    model: 'deepseek/deepseek-v3.2', 
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
        model: 'deepseek/deepseek-v3.2', 
        schema: BaseQuestionSchema,      // This is your Zod schema!
        schemaName: 'BaseQuestion',      // Optional: helps the LLM understand the context
        schemaDescription: 'A structured question for patient onboarding',
        system: SYSTEM_PROMPT,
        prompt: `
        CURRENT QUESTION COUNT: ${questionCount} of 7.
        User Biometrics: ${JSON.stringify(biometrics)}
        Conversation History: ${JSON.stringify(thread.messages)}
        
        Provide the next logical question in the assessment.
        If you have enough information to understand their safety and general mobility, 
        or if you have reached the last question, you MUST use "terminateQuestioning".
        `,
    });

  return object; 
}


export async function getExistingOnboardingData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      biometric: true,
      threads: {
        where: { type: "onboarding" },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
        take: 1
      }
    }
  });

  return {
    biometrics: user?.biometric || null,
    activeThread: user?.threads[0] || null
  };
}

export async function setBiometric(userId: string, bio: Biometrics) {
  return await prisma.biometrics.upsert({
    where: { 
      userId: userId 
    },
    update: {
      age: bio.age,
      sex: bio.sex,
      treatment: bio.treatment,
      surgeryDate: bio.surgeryDate,
    },
    create: {
      userId: userId, // Ensure the relation is linked on creation
      age: bio.age,
      sex: bio.sex,
      treatment: bio.treatment,
      surgeryDate: bio.surgeryDate,
    },
  });
}

type MessageRole = 'user' | 'assistant' | 'system';
export async function updateThread(
  userId: string,
  threadId: string | null,
  threadType: string | null = null,
  messages: BaseMessage[] = [],
) {
  const messageCreateData = messages.map((msg) => ({
    role: msg.role as MessageRole,
    content: msg.content,
    context: msg.context || {},
    creationSource: msg.creationSource,
    reasoning: msg.reasoning || null,
  }));

  if (threadId) {
    return await prisma.thread.update({
      where: { id: threadId },
      data: {
        messages: {
          create: messageCreateData,
        },
      },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });
  } else if (!threadType) {
    throw new Error('Invalid argument. If threadId is null, i.e create new thread, must provide thread type.')
  }
  const t = await prisma.thread.create({
    data: {
      userId,
      type: threadType,
      title: "New Assessment",
      messages: {
        create: messageCreateData,
      },
    },
    include: { messages: { orderBy: { createdAt: 'asc' } } }
  });

  const thread = ThreadSchema.parse(t)
  if (!thread) {
    throw new Error('thread is undefined')
  }
  return thread
}
