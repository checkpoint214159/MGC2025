import z from "zod"

// TODO: union or merge this with a Message? seems a lot more practical...
// but then again these are blueprints for our llm.
export const BaseQuestionMetadataSchema = z.object({
    intent: z.string(),
    reasoning: z.string().optional(),
    urgency: z.boolean().default(false),
    sliderMin: z.number().default(0),
    sliderMax: z.number().default(10),
    sliderLabels: z.array(z.string()).optional()
})

export const BaseQuestionSchema = z.object({
  id: z.string().optional().nullable(),
  questionText: z.string(),
  inputType: z.enum(['text', 'slider', 'choice', 'date', 'terminateQuestioning']),
  options: z.array(z.string()).optional(),
  metadata: BaseQuestionMetadataSchema, 
});

export const BaseUserResponseSchema = z.object({
  id: z.string(),
  answerText: z.string()
})

// const AnswerResponsePair = z.object({
//   id: z.string(),
//   question: BaseQuestionSchema.optional(),
//   answer: BaseUserResponseSchema.optional(),
// })

export type BaseQuestion = z.infer<typeof BaseQuestionSchema>
export type BaseQuestionMetadata = z.infer<typeof BaseQuestionMetadataSchema>
export type BaseUserResponse = z.infer<typeof BaseUserResponseSchema>


// export const BaseRAGSchema = z.object({
//   content: z.string(),
//   sources: z.array(z.object({
//     title: z.string(),
//     url: z.string().optional(),
//     snippet: z.string().optional()
//   })),
//   relevanceScore: z.number().min(0).max(1)
// });

// export const BaseCotSchema = z.object({
//   clinicalObservation: z.string(), // What the LLM noticed in previous data
//   hypothesis: z.string(),          // What the LLM is trying to rule out/confirm
//   nextQuestion: BaseQuestionSchema, // The actual UI component to render
// });

// export const OnboardingTurnSchema = z.discriminatedUnion("type", [
//   z.object({ 
//     type: z.literal("question"), 
//     data: BaseCotSchema 
//   }),
//   z.object({ 
//     type: z.literal("insight"), 
//     data: BaseRAGSchema 
//   }),
//   z.object({ 
//     type: z.literal("complete"), 
//     summary: z.string() 
//   }),
// ]);

// export function createAiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
//   return z.object({
//     timestamp: z.string().default(() => new Date().toISOString()),
//     processingTimeMs: z.number().optional(),
//     modelId: z.string(),
//     data: dataSchema, // where our question schemas go
//   });
// }


