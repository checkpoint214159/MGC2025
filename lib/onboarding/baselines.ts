// ------------------- BASELINES -------------------

import { generateObject } from "ai";
import { getModel } from "@/lib/llm/model";
import { BaselineSchema, QueryBaseline, QueryBaselineSchema } from "../user/baseline";
import { Biometrics } from "@/lib/user/schema";


const TAXONOMYPROMPT = `
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
`

// queries
export async function generateQueryBaseline(userId: string, biometrics: Biometrics) {
  // return EXAMPLE_BASELINE_QUERY_OUTPUT // for now
  const systemPrompt = `
  ### ROLE
  You are a Senior Clinical Architect specializing in Perioperative Medicine and the WHO-ICF framework. Your goal is to design a pre-operative baseline assessment.

  ### MISSION
  Select the most high-gain ICF indicators to track recovery for: ${biometrics.treatment}.
  You must generate exactly three axes of data as defined below.

  ${TAXONOMYPROMPT}

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



// baseline
export async function generateBaseline(
  biometrics: Biometrics, 
  userResponses: Record<string, number>, // The values from your sliders
  queryBaseline: QueryBaseline // The original questions for context
) {
  const systemPrompt = `
  ### ROLE
  You are a Clinical Data Analyst. Your task is to convert raw patient slider responses into a WHO-ICF Assessment Baseline.

  ### INPUT DATA
  1. Patient Context: ${biometrics.age}yo ${biometrics.sex} undergoing ${biometrics.treatment}.
  2. Raw Responses: ${JSON.stringify(userResponses)}
  3. The query used to obtain the above responses: ${JSON.stringify(queryBaseline)}

  ${TAXONOMYPROMPT}

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

  console.log('systemPrompt for baseline gen?', systemPrompt)
  console.log('userResponses?', userResponses)
  try {
    const { object } = await generateObject({
      model: getModel(),
      system: systemPrompt,
      prompt: `Translate these raw scores into a clinical ICF Baseline for POD 0: ${JSON.stringify(userResponses)}`,
      schema: BaselineSchema, // Uses the AssessmentICFEntrySchema variant
    });
    console.log('generateBaseline output:', object)
    return object;
  } catch (error) {
    console.error("Clinical Assessment Generation Failed:", error);
    throw new Error("Failed to synthesize clinical baseline.");
  }
}