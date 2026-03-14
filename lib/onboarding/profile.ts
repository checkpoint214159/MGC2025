import { generateObject } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/llm/model";
import { ProfileInput } from "@/lib/user/service";

export async function generateUserProfile({ thread, biometrics, baseline }: ProfileInput): Promise<string> {
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

        BASELINES:
        These are baselines devised off the WHO-ICF functional capacity assessment framework. Analyse
        carefully and account this into your generation.
        ${JSON.stringify(baseline, null, 2)} 
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
