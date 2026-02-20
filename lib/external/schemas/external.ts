import z from "zod"
import { ThreadContextSchema } from "./thread";

export const ExternalSchema = z.object({
  id: z.string(),
  dateCreated: z.coerce.date(),
  threadContext: ThreadContextSchema, // Validates your "Frozen" JSON
  profile: z.string(),
});

export type External = z.infer<typeof ExternalSchema>