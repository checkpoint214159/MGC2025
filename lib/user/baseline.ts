import { create } from 'domain';
import { z } from 'zod';
import { BaseQuestionSchema } from '../llm/schemas/base';

/*
These baselines for FC are currently inspired after WHO-ICF categories:
https://apps.who.int/classifications/icfbrowser/ (expand using the + boxes to see them)

Based on help with Gemini, I reached the following 3 axis for establishing baselines:
(obv ai wrote these, but i verified logically and it does check out)
Axis A: Biomechanical (Structure & Impairment)
ICF Domains: s (All structures), b2 (Sensory/Pain), b7 (Neuromusculoskeletal), b8 (Skin).
Focus: Is the "hardware" intact and the site-specific function firing?

Axis B: Functional Capacity (Activity)
ICF Domains: d4 (Mobility), d5 (Self-care), d6 (Domestic life).
Focus: Can the patient execute the integrated movements required for independence?

Axis C: Systemic Homeostasis (General Functions)
ICF Domains: b4 (Cardio/Resp), b5 (Digestive/Metabolic), b6 (Genitourinary).
Focus: Are the internal systems stable and supporting the "stress" of recovery?

We currently hardcode it these three ways, but the base class should offer some flexibility
should there be planned changes

Also all this will probably be bad and unreliable without RAG. so gg
*/

// The basic unit of an ICF-grounded metric
// const ICFEntrySchema = z.object({
//   code: z.string().regex(/^[bsde]\d+/),
//   name: z.string(),
//   value: z.number(),
//   qualifier: z.number().min(0).max(4),
//   assessment: z.string().describe("The user's qualitative answer converted to clinical text"),
// });

export const ICFEntrySchema = z.object({
  code: z.string().regex(/^[bsde]\d+/).describe(
    "The official WHO-ICF alphanumeric code (e.g., b280 for Pain, d450 for Walking)."
  ),
  domain: z.string().describe(
    "The high-level ICF category or body system (e.g., 'Genitourinary Functions' or 'Mobility')."
  ),
  indicator: z.string().describe(
    "the specific clinical sign or symptom being tracked (e.g., 'Incision Pain' or 'Urine Clarity')."
  ),
  unit: z.string().describe(
    "The measurement unit for the value (e.g., '1-10 scale', 'meters', 'ml', 'mmHg')."
  ),
  range: z.number().describe(
    "The numeric range of values of which the indicator can take."
  ),
  justification: z.string().describe(
    "Justification for why this ICF code was chosen."
  ),
});

export const AssessmentICFEntrySchema = ICFEntrySchema.extend({
    value: z.number().describe("No need to generate this"),
    qualifier: z.number().min(0).max(4).describe(
        "The WHO-ICF severity score. 0: No problem (0-4%); 1: Mild (5-24%); 2: Moderate (25-49%); 3: Severe (50-95%); 4: Complete (96-100%). \
        This must reflect the severity relative to the specific Post-Op Day (POD)."
    ),
    assessment: z.string().describe(
        "The clinical synthesis explaining the relationship between the value and the qualifier. \
        Must justify why the raw value results in that specific severity level for this patient's surgery and recovery stage."
    ),
})

export const QueryICFEntrySchema = ICFEntrySchema.extend({
  question: BaseQuestionSchema
})

export type AssessmentICFEntry = z.infer<typeof AssessmentICFEntrySchema>
export type QueryICFEntry = z.infer<typeof QueryICFEntrySchema>
export type ICFEntry = z.infer<typeof ICFEntrySchema>

function createAxisSchema<T extends z.ZodType<ICFEntry>>({
    schema,
}: {
    schema: T;
}) {
    //
    return z.object({
        axisType: z.enum(["A", "B", "C"]),
        // The LLM will populate this array based on the RAG-retrieved Core Set
        entries: z.array(schema), 
        summary: z.string().describe(
            `Executive summary of this axis status.
            Axis A: Biomechanical (Structure & Impairment)
            ICF Domains: s (All structures), b2 (Sensory/Pain), b7 (Neuromusculoskeletal), b8 (Skin).
            Focus: Is the "hardware" intact and the site-specific function firing?

            Axis B: Functional Capacity (Activity)
            ICF Domains: d4 (Mobility), d5 (Self-care), d6 (Domestic life).
            Focus: Can the patient execute the integrated movements required for independence?

            Axis C: Systemic Homeostasis (General Functions)
            ICF Domains: b4 (Cardio/Resp), b5 (Digestive/Metabolic), b6 (Genitourinary).
            Focus: Are the internal systems stable and supporting the "stress" of recovery?
            `),
        });
}


// 'query' since we are querying the user
export const AxisQuerySchema = createAxisSchema({schema: QueryICFEntrySchema}) 
export const AxisAssessmentSchema = createAxisSchema({schema: AssessmentICFEntrySchema})

export type AxisQuery = z.infer<typeof AxisQuerySchema>
export type AxisAssessment = z.infer<typeof AxisAssessmentSchema>

function BaselineGenerationSchema(schema: z.ZodObject) {
    return  z.object({
        axes: z.object({
            biomechanical: schema.extend({axisType: z.literal('A')}),
            functional: schema.extend({axisType: z.literal('B')}),
            systemic: schema.extend({axisType: z.literal('C')}),
        }),
    });
}

export const QueryBaselineSchema = BaselineGenerationSchema(AxisQuerySchema)
export const BaselineSchema = BaselineGenerationSchema(AxisAssessmentSchema)

export type QueryBaseline = z.infer<typeof QueryBaselineSchema>
export type Baseline = z.infer<typeof BaselineSchema>

