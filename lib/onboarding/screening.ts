import { z } from "zod";

/**
 * PAR-Q (Physical Activity Readiness Questionnaire) — static pre-activity screening.
 *
 * This replaces the old ICF "baseline" step. It is intentionally NOT LLM-generated
 * and NOT LLM-scored: the questions are fixed, and the gate is a deterministic rule.
 *
 * Gate rule: a "YES" to ANY question flags the patient. An unsupervised patient
 * (one who is NOT managed by a doctor via AdminPatientRelation) must clear the
 * screening (all "NO") to proceed. A doctor-assigned patient still answers the
 * questionnaire — their answers are recorded — but is never blocked, because the
 * medical institution has already screened them.
 *
 * Source: HPB / Healthy 365 PAR-Q.
 */

export interface ParqQuestion {
    id: string;
    text: string;
}

export const PARQ_QUESTIONS: ParqQuestion[] = [
    {
        id: "q1_heart_condition",
        text: "Has your doctor ever said that you have a heart condition and that you should only do physical activity recommended by a doctor?",
    },
    {
        id: "q2_chest_pain",
        text: "In the past month, have you had chest pain when you engage in physical activity, or when not participating in any physical activity at all?",
    },
    {
        id: "q3_balance_dizziness",
        text: "In the past month, have you lost your balance because of dizziness, or ever lost consciousness?",
    },
    {
        id: "q4_bone_joint",
        text: "Do you have any bone, joint or muscle problem (e.g. back, knee, hip, shoulder or ankle) that could be made worse by physical activity?",
    },
    {
        id: "q5_blood_pressure_meds",
        text: "Is your doctor currently prescribing drugs (for example, water pills) for your blood pressure or heart condition?",
    },
    {
        id: "q6_other_reason",
        text: "Do you know of any reason why you should not be participating in this exercise programme or any other physical activity?",
    },
];

const PARQ_IDS = PARQ_QUESTIONS.map((q) => q.id) as [string, ...string[]];

/** true = "YES" (a potential contraindication), false = "NO". */
export const ScreeningAnswersSchema = z.object(
    Object.fromEntries(PARQ_IDS.map((id) => [id, z.boolean()])),
) as z.ZodType<Record<string, boolean>>;

export type ScreeningAnswers = Record<string, boolean>;

export const ScreeningResultSchema = z.object({
    answers: z.record(z.string(), z.boolean()),
    anyFlag: z.boolean(),
    supervised: z.boolean(),
    passed: z.boolean(),
});

export type ScreeningResult = z.infer<typeof ScreeningResultSchema>;

/**
 * Deterministic gate. No LLM.
 *
 * @param answers    the patient's YES/NO answers
 * @param supervised whether the patient is doctor-assigned (has an AdminPatientRelation)
 */
export function evaluateScreening(
    answers: ScreeningAnswers,
    supervised: boolean,
): ScreeningResult {
    const anyFlag = Object.values(answers).some(Boolean);
    // Blocked only when an unsupervised patient flags something.
    const passed = supervised || !anyFlag;
    return { answers, anyFlag, supervised, passed };
}
