import z from "zod"

const BaseQuestionSchema = z.object({
  id: z.string(),
  questionText: z.string(),
  inputType: z.enum(['text', 'slider', 'choice', 'date']),
  options: z.array(z.string()).optional(),
  metadata: z.object({
    intent: z.string(),
    reasoning: z.string(),
    urgency: z.boolean().default(false)
  }),

});

const BaseAnswerSchema = z.object({
  id: z.string(),
  answerText: z.string()
})

const AnswerResponsePair = z.object({
  id: z.string(),
  question: BaseQuestionSchema.optional(),
  answer: BaseAnswerSchema.optional(),
})


const BaseChainSchema = z.object({
  id: z.string(),
  chain: z.array(AnswerResponsePair),
})

const BaseChatSchema = z.object({
  id: z.string(),
  chat: z.array(BaseChainSchema)
})



export const BaseRAGSchema = z.object({
  content: z.string(),
  sources: z.array(z.object({
    title: z.string(),
    url: z.string().optional(),
    snippet: z.string().optional()
  })),
  relevanceScore: z.number().min(0).max(1)
});

export const BaseCotSchema = z.object({
  clinicalObservation: z.string(), // What the LLM noticed in previous data
  hypothesis: z.string(),          // What the LLM is trying to rule out/confirm
  nextQuestion: BaseQuestionSchema, // The actual UI component to render
});

export const OnboardingTurnSchema = z.discriminatedUnion("type", [
  z.object({ 
    type: z.literal("question"), 
    data: BaseCotSchema 
  }),
  z.object({ 
    type: z.literal("insight"), 
    data: BaseRAGSchema 
  }),
  z.object({ 
    type: z.literal("complete"), 
    summary: z.string() 
  }),
]);

export function createAiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    timestamp: z.string().default(() => new Date().toISOString()),
    processingTimeMs: z.number().optional(),
    modelId: z.string(),
    data: dataSchema, // where our question schemas go
  });
}


