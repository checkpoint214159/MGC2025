import { generateObject } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/llm/model";
import { ProfileInput } from "@/lib/user/service";

export async function generateUserProfile({ thread, biometrics, screening }: ProfileInput): Promise<string> {
  // Extracting conversational history for context
  const history = thread.messages
    ?.map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n") ?? "No conversation history.";

  const systemPrompt = `
  ### ROLE
  You are a Senior Clinical Analyst. Your task is to synthesize raw onboarding data into a "Patient Recovery Profile."

  ### OBJECTIVE
  Transform the biometrics and the conversational thread into a structured, executive summary. Do not use conversational filler (e.g., "This patient is..."). Use objective, clinical language.

  ### ANALYSIS FRAMEWORK (The 4 Pillars)
  Analyze the input data through these four lenses:
  1. **Clinical Context:** Age, sex, surgery type, and postoperative day (calculated from surgery date).
  2. **Safety Profile:** PAR-Q physical-activity readiness screening flags (e.g. cardiac history, chest pain, dizziness, musculoskeletal limitation, blood-pressure/heart medication). If the patient flagged nothing, state "No acute safety concerns reported."
  3. **Recovery Environment:** Home layout/accessibility, caregiver support, living-alone status, and independence in ADLs (Activities of Daily Living).
  4. **Lifestyle Logistics:** Occupation/activity level, nutritional preferences, and sleep hygiene.

  ### OUTPUT GUIDELINES
  - **Structure:** Provide a single paragraph of 150-200 words.
  - **Precision:** Use specific terms found in the thread (e.g., "uses a rolling walker" rather than "needs help walking").
  - **Insight:** If the patient's answers suggest a psychological barrier (e.g., "fear of falling"), include this as a "Recovery Barrier."

  ### CONSTRAINTS
  - Do not hallucinate data. If a pillar (like sleep) wasn't discussed, do not mention it.
  - Maintain a tone of professional neutrality.
  - **TERMINATION:** End the profile with a "Screening Risk Level" (Low, Moderate, High) based on the PAR-Q flags and reported lifestyle factors.
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

        SCREENING (PAR-Q):
        Physical Activity Readiness results. "answers" maps each PAR-Q question id to YES (true) or NO (false);
        any YES is a potential contraindication to exercise. "passed" indicates whether the patient cleared the
        gate (note: doctor-supervised patients pass regardless). Account for any flags in the Safety Profile.
        ${JSON.stringify(screening, null, 2)}
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
