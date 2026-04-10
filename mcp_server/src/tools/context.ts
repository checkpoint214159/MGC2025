import { prisma } from "@/lib/prisma";
import { ThreadSchema } from "@/lib/external/schemas/thread";
import { ExternalSchema } from "@/lib/external/schemas/external";

export const contextTools = [
  {
    name: "get_onboarding_thread",
    description:
      "Retrieve the patient's onboarding conversation thread — the five free-form questions " +
      "answered during intake. Contains assistant questions and user responses in chronological order.",
    inputSchema: {
      type: "object" as const,
      properties: {
        userId: { type: "string", description: "The patient's unique identifier" },
      },
      required: ["userId"],
    },
    handler: async (args: { userId: string }) => {
      const thread = await prisma.thread.findFirst({
        where: { userId: args.userId, type: "onboarding" },
        include: {
          messages: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { createdAt: "desc" }, // most recent onboarding thread first
      });

      if (!thread) return null;

      return ThreadSchema.parse(thread);
    },
  },

  {
    name: "get_compiled_external",
    description:
      "Retrieve the compiled External context snapshot — the frozen record of thread context " +
      "and patient profile that was fed into state generation. This is the causal input for " +
      "understanding why a specific recovery plan was generated.",
    inputSchema: {
      type: "object" as const,
      properties: {
        userId: { type: "string", description: "The patient's unique identifier" },
        stateId: {
          type: "string",
          description:
            "If provided, returns the External record linked to this specific State. " +
            "If omitted, returns the most recent External for the user.",
        },
      },
      required: ["userId"],
    },
    handler: async (args: { userId: string; stateId?: string }) => {
      let external;

      if (args.stateId) {
        // Find the External that caused this state (via State.causalXId)
        const state = await prisma.state.findUnique({
          where: { id: args.stateId },
          select: { causalXId: true },
        });

        if (!state?.causalXId) return null;

        external = await prisma.external.findUnique({
          where: { id: state.causalXId },
        });
      } else {
        // Return most recent External for the user
        external = await prisma.external.findFirst({
          where: { userId: args.userId },
          orderBy: { dateCreated: "desc" },
        });
      }

      if (!external) return null;

      return ExternalSchema.parse(external);
    },
  },

  {
    name: "list_patient_threads",
    description:
      "List all conversation threads for a patient (onboarding, chat, doctor notes, etc.) " +
      "with basic metadata. Does not include message content — use get_onboarding_thread for that.",
    inputSchema: {
      type: "object" as const,
      properties: {
        userId: { type: "string", description: "The patient's unique identifier" },
        type: {
          type: "string",
          description:
            "Optional filter by thread type (e.g. 'onboarding', 'chat', 'doctor_note'). " +
            "If omitted, returns all thread types.",
        },
      },
      required: ["userId"],
    },
    handler: async (args: { userId: string; type?: string }) => {
      const threads = await prisma.thread.findMany({
        where: {
          userId: args.userId,
          ...(args.type ? { type: args.type } : {}),
        },
        select: {
          id: true,
          type: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { messages: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return threads.map((t) => ({
        id: t.id,
        type: t.type,
        title: t.title,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        messageCount: t._count.messages,
      }));
    },
  },
];
