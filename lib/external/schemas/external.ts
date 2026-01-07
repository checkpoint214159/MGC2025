import z from "zod"
import { ThreadContextSchema } from "./thread";

export const ExternalSchema = z.object({
  id: z.string(),
  dateCreated: z.coerce.date(),
  threadContext: ThreadContextSchema, // Validates your "Frozen" JSON
  messageCount: z.number().nullable(),
  threadCount: z.number().nullable(),
});
