import z from "zod";
import {
    BaseQuestionSchema,
    BaseQuestion,
    BaseUserResponseSchema,
    BaseUserResponse,
    BaseQuestionMetadataSchema,
} from "@/lib/llm/schemas/base";

export const BaseMessageSchema = z.object({
    role: z.enum(["user", "assistant", "system"]),
    id: z.string().optional(),
    creationSource: z.string(),
    threadId: z.string().nullable(),
    content: z.string(),
    reasoning: z.string().nullable().optional(),
    createdAt: z.coerce.date(),
    context: z.any().nullable().optional(),
});

export const UserMessageSchema = BaseMessageSchema.extend({
    role: z.literal("user"),
    context: z.any().nullable().optional(),
});

const AssistantContextSchema = z.object({
    inputType: z.enum([
        "text",
        "slider",
        "choice",
        "date",
        "terminateQuestioning",
    ]),
    options: z.array(z.string()).optional(),
    metadata: BaseQuestionMetadataSchema,
});

export const AssistantMessageSchema = BaseMessageSchema.extend({
    role: z.literal("assistant"),
    context: AssistantContextSchema,
});

export type BaseMessage = z.infer<typeof BaseMessageSchema>;
export type UserMessage = z.infer<typeof UserMessageSchema>;
export type AssistantMessage = z.infer<typeof AssistantMessageSchema>;

export const convertQuestionToMessage = (
    { questionText, inputType, options, metadata }: BaseQuestion,
    threadId: string | null,
    source: string,
): AssistantMessage => ({
    threadId: threadId,
    role: "assistant",
    content: questionText,
    creationSource: source,
    createdAt: new Date(),
    context: {
        metadata: metadata,
        inputType: inputType,
        options: options,
    },
});

export const convertMessageToQuestion = (msg: AssistantMessage) => ({
    questionText: msg.content,
    metadata: msg.context.metadata,
    inputType: msg.context.inputType,
    options: msg.context.options,
});

export const convertResponseToMessage = (
    answerText: string,
    threadId: string,
    source: string,
): UserMessage => ({
    threadId: threadId,
    role: "user",
    content: answerText,
    creationSource: source,
    createdAt: new Date(),
});
