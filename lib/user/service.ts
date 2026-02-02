import { generateObject } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Biometrics } from "./schema";
import { Thread, ThreadSchema } from "@/lib/external/schemas/thread";
import { getModel } from "../llm/model";
import { BaseMessage } from "@/lib/external/schemas/message";
import { Baselines, BaselinesSchema, QueryBaselines, QueryBaselineSchema } from "./baseline";

export interface ProfileInput {
  thread: Thread;
  biometrics: Biometrics;
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


export async function generateQueryBaseline(userId: string, biometrics: Biometrics) {
  // return EXAMPLE_BASELINE_QUERY_OUTPUT // for now
  const systemPrompt = `
  ### ROLE
  You are a Senior Clinical Architect specializing in Perioperative Medicine and the WHO-ICF framework. Your goal is to design a pre-operative baseline assessment.

  ### MISSION
  Select the most high-gain ICF indicators to track recovery for: ${biometrics.treatment}.
  You must generate exactly three axes of data as defined below.

  ### CLINICAL TAXONOMY CONSTRAINTS
  1. **Axis A: Biomechanical (Structure/Impairment)**
    - Required Domains: s (Structures), b2 (Sensory/Pain), b7 (Neuromusculoskeletal), b8 (Skin).
    - Focus: Surgical site integrity, incision pain, and local tissue status.

  2. **Axis B: Functional Capacity (Activity)**
    - Required Domains: d4 (Mobility), d5 (Self-care), d6 (Domestic life).
    - Focus: Autonomy, core strength for transfers, and ADLs (Activities of Daily Living).

  3. **Axis C: Systemic Homeostasis (General Functions)**
    - Required Domains: b4 (Cardiovascular/Respiratory), b5 (Digestive/Metabolic), b6 (Genitourinary).
    - Focus: GI motility, hydration, and metabolic stability.

  ### QUESTION PROTOCOL
  - For each entry, craft a 'questionText' that is patient-facing but clinically precise.
  - Assign a logical 'range' (usually 0-10) and 'unit' (e.g., '1-10 scale', 'meters').
  - Pre-operative baselines represent the patient's "normal" state.
  `;
  try {
    const { object } = await generateObject({
      model: getModel(),
      system: systemPrompt,
      prompt: `Generate the baseline axes for a ${biometrics.age}yo ${biometrics.sex} undergoing ${biometrics.treatment}.`,
      schema: QueryBaselineSchema, // Uses the schema we built in previous steps
    });
    console.log('generateBasleine output?', object)
    return object;
  } catch (error) {
    console.error("Baseline Generation Failed:", error);
    throw new Error("Failed to initialize clinical baseline.");
  }
}

export async function setQueryBaseline(userId: string, queryBaseline: QueryBaseline) {
  return await prisma.user.update({
    where: {id: userId},
    data: {
      queryBaseline: queryBaseline
    }
  })
}

export async function getQueryBaseline(userId: string) {
  return await prisma.user.findUnique({
    where: {id: userId},
    select: {
      queryBaseline: true
    }
  })
}

export async function generateBaseline(
  biometrics: Biometrics, 
  userResponses: Record<string, number>, // The values from your sliders
  queryBaseline: QueryBaselines // The original questions for context
) {
  const systemPrompt = `
  ### ROLE
  You are a Clinical Data Analyst. Your task is to convert raw patient slider responses into a WHO-ICF Assessment Baseline.

  ### INPUT DATA
  1. Patient Context: ${biometrics.age}yo ${biometrics.sex} undergoing ${biometrics.treatment}.
  2. Raw Responses: ${JSON.stringify(userResponses)}

  ### MISSION
  For each raw value provided, you must determine the WHO-ICF Qualifier:
  - 0 (NO problem): 0-4% impairment
  - 1 (MILD problem): 5-24%
  - 2 (MODERATE problem): 25-49%
  - 3 (SEVERE problem): 50-95%
  - 4 (COMPLETE problem): 96-100%

  ### OUTPUT RULES
  - 'assessment': Write a clinical synthesis for each entry. (e.g., "Patient reports 8/10 mobility, correlating to a Qualifier 0, indicating optimal pre-operative functional reserve.")
  - 'qualifier': Must be an integer 0-4.
  - 'summary': Provide a high-level executive summary for each of the three Axes (A, B, C).
  `;

  try {
    const { object } = await generateObject({
      model: getModel(),
      system: systemPrompt,
      prompt: `Translate these raw scores into a clinical ICF Baseline for POD 0: ${JSON.stringify(userResponses)}`,
      schema: BaselinesSchema, // Uses the AssessmentICFEntrySchema variant
    });
    console.log('generateBaseline output:', object)
    return object;
  } catch (error) {
    console.error("Clinical Assessment Generation Failed:", error);
    throw new Error("Failed to synthesize clinical baseline.");
  }
}

export async function setBaseline(userId: string, baselineData: Baselines) {
  return await prisma.baselines.upsert({
    where: { userId: userId },
    update: { data: baselineData as any },
    create: {
      userId: userId,
      data: baselineData as any,
    },
  });
}

export async function getBaseline(userId: string) {
  return await prisma.user.findUnique({
    where: {id: userId},
    select: {
      baselines: true
    }
  })
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
      },
      baselines: true
    }
  });

  return {
    biometrics: user?.biometric || null,
    activeThread: user?.threads[0] || null,
    baselines: user?.baselines || null,
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



const EXAMPLE_BASELINE_QUERY_OUTPUT: QueryBaseline = {
  "axes": {
    "biomechanical": {
      "axisType": "A",
      "entries": [
        {
          "code": "s540",
          "domain": "Structures of the Digestive System",
          "indicator": "Abdominal Wall Integrity",
          "value": 10,
          "unit": "1-10 scale",
          "qualifier": 0,
          "assessment": "Pre-operative baseline: No herniation or muscular weakness reported in the abdominal wall."
        },
        {
          "code": "b280",
          "domain": "Sensory Functions",
          "indicator": "Abdominal Pain",
          "value": 0,
          "unit": "1-10 scale",
          "qualifier": 0,
          "assessment": "Patient currently reports 0/10 pain; baseline for post-op comparison."
        }
      ]
    },
    "functional": {
      "axisType": "B",
      "entries": [
        {
          "code": "d570",
          "domain": "Self-Care",
          "indicator": "Toileting Autonomy",
          "value": 10,
          "unit": "1-10 scale",
          "qualifier": 0,
          "assessment": "Patient is currently independent in all bowel/bladder management."
        },
        {
          "code": "d410",
          "domain": "Mobility",
          "indicator": "Supine-to-Stand Transition",
          "value": 10,
          "unit": "1-10 scale",
          "qualifier": 0,
          "assessment": "Full core-strength utilized for bed transfers without assistance."
        }
      ]
    },
    "systemic": {
      "axisType": "C",
      "entries": [
        {
          "code": "b515",
          "domain": "Digestive Functions",
          "indicator": "Bowel Motility",
          "value": 10,
          "unit": "1-10 scale",
          "qualifier": 0,
          "assessment": "Regular bowel movements; no history of chronic ileus or obstruction."
        },
        {
          "code": "b440",
          "domain": "Respiratory Functions",
          "indicator": "Inspiratory Capacity",
          "value": 2500,
          "unit": "ml",
          "qualifier": 0,
          "assessment": "Age-appropriate lung volume; critical for post-op pneumonia prevention."
        }
      ]
    }
  }
}