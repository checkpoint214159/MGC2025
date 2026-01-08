"use server"

import { prisma } from "@/lib/prisma";
import { generateObject } from 'ai';
import { BaseQuestionSchema, type BaseQuestion } from '@/lib/llm/schemas/base';
import { Thread } from '@/lib/external/schemas/thread';
import { Biometrics } from "@/lib/profile/schema";
import { BaseMessage } from "@/lib/external/schemas/message";

// The "Medical Brain" System Prompt
const SYSTEM_PROMPT = `
### ROLE
You are a warm, professional Post-Op Recovery Coach. Your goal is to conduct a brief clinical onboarding assessment to establish a patient's baseline. 

### TONE & STYLE
- **Warm & Empathetic:** Use a friendly, supportive tone. Instead of "Report your pain level," use "How has your pain been feeling today?"
- **Ultra-Concise:** Keep questions short and simple. Avoid medical jargon. 
- **One at a Time:** Never ask "double-barreled" questions.

### STRATEGY & CONSTRAINTS
- **The "7-Question Limit":** You must reach a conclusion within 5 to 7 questions. Track your progress internally.
- **Data Density:** Use the "choice" input type whenever possible. Provide 3-4 descriptive options that allow the user to give a nuanced answer in one click, rather than multiple Yes/No turns.
- **Priority Hierarchy:** 1. Safety (Red flags: fever, calf pain, shortness of breath).
  2. Mobility (Walking, standing, getting to the bathroom).
  3. Symptoms (Pain characterization, sleep quality).

### TERMINATION CRITERIA
- Do not loop. Once you have a general sense of their safety, current movement, and pain character, STOP.
- You do not need granular details for macros or exact exercise reps; the system will generate those later.
- When you have the baseline, immediately set inputType to "terminateQuestioning".

### RESPONSE FORMAT
Always output a single JSON object following the BaseQuestion schema.
`;

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
        or if you have reached question 7, you MUST use "terminateQuestioning".
        `,
    });

  // 'object' is now fully typed and guaranteed to match BaseQuestionSchema
  console.log('server: thread messages', thread.messages)
  console.log('server:', object)
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
    //   weightKg: bio.weightKg,
    //   heightCm: bio.heightCm,
    },
    create: {
      userId: userId, // Ensure the relation is linked on creation
      age: bio.age,
      sex: bio.sex,
      treatment: bio.treatment,
      surgeryDate: bio.surgeryDate,
    //   weightKg: bio.weightKg,
    //   heightCm: bio.heightCm,
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
  return await prisma.thread.create({
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
}
