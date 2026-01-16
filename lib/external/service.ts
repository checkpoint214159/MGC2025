import { External, ExternalSchema } from "./schemas/external"
import { ThreadContext } from "./schemas/thread"
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client"

export async function compileExternal(userId: string, threadContext: ThreadContext, profile: string) : External {
  // compiles and saves to db an instance of external
  const e = await prisma.external.create({
    data: {
      userId: userId,
      threadContext: threadContext as unknown as Prisma.InputJsonValue,
      profile: profile,
    }
  })

  return ExternalSchema.parse(e)
}

