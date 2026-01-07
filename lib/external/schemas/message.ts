import z from "zod"
import { BaseQuestionSchema, BaseQuestion, BaseUserResponseSchema, BaseUserResponse } from "@/lib/llm/schemas/base";

export const MessageSchema = z.object({
  id: z.string().optional(),  // should be left empty unless loaded in from DB
  // DB is source of id truth, not us
  creationSource: z.string(),
  threadId: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  context: z.any().nullable().optional(), // Flexible JSON
  reasoning: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
});

export type Message = z.infer<typeof MessageSchema>

export const convertQuestionToMessage = ({
  questionText,
  inputType,
  options,
  metadata,
}: BaseQuestion, threadId: string, source: string): Message => ({
  threadId: threadId,
  role: "assistant",
  content: questionText,
  creationSource: source,
  createdAt: new Date(),
  context: metadata
});

export const convertResponseToMessage = (
  answerText: string, threadId: string, source: string
): Message => ({
  threadId: threadId,
  role: "user",
  content: answerText,
  creationSource: source,
  createdAt: new Date(),
});