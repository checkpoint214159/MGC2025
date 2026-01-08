import z from "zod"
import { BaseMessageSchema } from "./message";

export const ThreadSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.string(),
  title: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  messages: z.array(BaseMessageSchema).optional()
});

export const ThreadContextSchema = z.array(ThreadSchema)

export type Thread = z.infer<typeof ThreadSchema>
export type ThreadContext = z.infer<typeof ThreadContextSchema>
