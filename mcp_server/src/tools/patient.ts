import { prisma } from "@/lib/prisma";
import { StateSchema } from "@/lib/state/schemas/state";

/** Normalize a JS Date to midnight (00:00:00.000) for Prisma @db.Date queries */
function normalizeDate(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

export const patientTools = [
  {
    name: "get_patient_profile",
    description:
      "Retrieve a patient's demographics, biometrics, baseline assessment, and onboarding status",
    inputSchema: {
      type: "object" as const,
      properties: {
        userId: { type: "string", description: "The patient's unique identifier" },
      },
      required: ["userId"],
    },
    handler: async (args: { userId: string }) => {
      const user = await prisma.user.findUnique({
        where: { id: args.userId },
        include: {
          biometric: true,
          baseline: true,
        },
      });

      if (!user) throw new Error(`User ${args.userId} not found`);

      return {
        id: user.id,
        name: user.name,
        role: user.role,
        biometrics: user.biometric ?? null,
        baseline: user.baseline?.data ?? null,
        queryBaseline: user.queryBaseline ?? null,
        profile: user.profile ?? null,
        // A patient has completed onboarding once all three artefacts exist
        doneOnboarding: !!user.profile && !!user.biometric && !!user.baseline,
      };
    },
  },

  {
    name: "get_patient_state",
    description:
      "Retrieve the active recovery state (and module progress) for a patient on a given date",
    inputSchema: {
      type: "object" as const,
      properties: {
        userId: { type: "string", description: "The patient's unique identifier" },
        date: {
          type: "string",
          description: "ISO 8601 date string (YYYY-MM-DD). Defaults to today.",
        },
        includeProgress: {
          type: "boolean",
          description: "Whether to include module progress/trackables. Defaults to true.",
        },
      },
      required: ["userId"],
    },
    handler: async (args: {
      userId: string;
      date?: string;
      includeProgress?: boolean;
    }) => {
      const date = normalizeDate(args.date ? new Date(args.date) : new Date());
      const withProgress = args.includeProgress ?? true;

      const state = await prisma.state.findFirst({
        where: {
          userId: args.userId,
          dateCreated: date,
          isActive: true,
        },
        include: {
          modules: { include: { progress: withProgress } },
          causalX: true,
        },
      });

      if (!state) return null;

      return StateSchema.parse(state);
    },
  },
];
