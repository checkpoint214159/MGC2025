import { generateObject } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Biometrics } from "./schema";
import { Thread, ThreadSchema } from "@/lib/external/schemas/thread";
import { getModel } from "../llm/model";
import { BaseMessage } from "@/lib/external/schemas/message";

export interface ProfileInput {
  thread: Thread;
  biometrics: Biometrics;
}

export async function setProfile(userId: string, profile: string) {
  return await prisma.user.update({
    where: { id: userId },
    data: {
      profile: profile,
    },
  });
}

export async function generateUserProfile({ thread, biometrics }: ProfileInput): Promise<string> {
  // Extracting conversational history for context
  const history = thread.messages
    ?.map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n") ?? "No conversation history.";

  const systemPrompt = `
  ### ROLE
  You are a Senior Clinical Analyst. Your task is to synthesize raw onboarding data into a "Patient Recovery Baseline."

  ### OBJECTIVE
  Transform the biometrics and the conversational thread into a structured, executive summary. Do not use conversational filler (e.g., "This patient is..."). Use objective, clinical language.

  ### ANALYSIS FRAMEWORK (The 4 Pillars)
  Analyze the input data through these four lenses:
  1. **Clinical Context:** Age, sex, surgery type, and postoperative day (calculated from surgery date).
  2. **Safety Profile:** Presence or absence of red flags (DVT, infection, respiratory). If absent, state "No acute safety concerns reported."
  3. **Functional Mobility:** Current weight-bearing status, use of assistive devices, and independence in ADLs (Activities of Daily Living).
  4. **Symptom Management:** Pain characterization (sharp, dull, neuropathic), sleep quality, and medication efficacy.

  ### OUTPUT GUIDELINES
  - **Structure:** Provide a single paragraph of 150-200 words.
  - **Precision:** Use specific terms found in the thread (e.g., "uses a rolling walker" rather than "needs help walking").
  - **Insight:** If the patient's answers suggest a psychological barrier (e.g., "fear of falling"), include this as a "Recovery Barrier."

  ### CONSTRAINTS
  - Do not hallucinate data. If a pillar (like sleep) wasn't discussed, do not mention it.
  - Maintain a tone of professional neutrality.
  - **TERMINATION:** End the profile with a "Baseline Risk Level" (Low, Moderate, High) based on symptoms reported.
  `

  console.log('BIO??', biometrics)
  console.log('HISTORY CONVO??', history)
  try {
    const { object } = await generateObject({
      model: getModel(),
      system: systemPrompt,
      prompt: `
        CONVERSATION HISTORY:
        ${history}

        BIOMETRICS:
        You MUST abide by these biometrics fully. 
        Do NOT change ANY biometric data, especially age, sex and treatment type
        ${JSON.stringify(biometrics, null, 2)}
      `,
      schema: z.object({
        summary: z.string().describe("The synthesized clinical profile of the patient."),
      }),
    });
    console.log('PROFILE GEN PROMTP??', `
        CONVERSATION HISTORY:
        ${history}

        BIOMETRICS:
        You MUST abide by these biometrics fully. 
        Do NOT change ANY biometric data, especially age, sex and treatment type
        ${JSON.stringify(biometrics, null, 2)}
      `)
    console.log("profile?", object)
    return object.summary;
  } catch (error) {
    console.error("LLM Profile Generation Failed:", error);
    return "Profile generation unavailable at this time.";
  }
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

export async function deleteOnboardingData(userId: string) {
  await prisma.user.update({
    where: {id: userId},
    data: {
      biometric: undefined,
      threads: {
        deleteMany: {
          type: "onboarding"
        }
      },
      profile: null,
    }
  })
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
