import { generateNewState, updateModuleProgress } from "@/lib/state/service";
import { prisma } from "@/lib/prisma";

/** Normalize a JS Date to midnight (00:00:00.000) for Prisma @db.Date queries */
function normalizeDate(d: Date): Date {
    const out = new Date(d);
    out.setHours(0, 0, 0, 0);
    return out;
}

export const planningTools = [
    {
        name: "generate_daily_state",
        description:
            "Trigger the LangGraph state generation pipeline to produce today's recovery plan for a patient. " +
            "Creates exercise and nutrition modules based on patient history and onboarding context. " +
            "Safe to call multiple times — deactivates any existing state for the day before creating a new one.",
        inputSchema: {
            type: "object" as const,
            properties: {
                userId: {
                    type: "string",
                    description: "The patient's unique identifier",
                },
                date: {
                    type: "string",
                    description:
                        "ISO 8601 date string (YYYY-MM-DD). Defaults to today.",
                },
            },
            required: ["userId"],
        },
        handler: async (args: { userId: string; date?: string }) => {
            const date = normalizeDate(
                args.date ? new Date(args.date) : new Date(),
            );

            const state = await generateNewState(args.userId, date);

            return {
                stateId: state.id,
                dateCreated: state.dateCreated,
                modules: state.modules.map((m) => ({
                    type: m.type,
                    summary: m.summary,
                })),
                generatedAt: new Date().toISOString(),
            };
        },
    },

    {
        name: "update_module_progress",
        description:
            "Update trackable progress items on a specific module (e.g., mark exercise sets as done, " +
            "record nutrition intake). The moduleId is found in the modules array of a patient state.",
        inputSchema: {
            type: "object" as const,
            properties: {
                moduleId: {
                    type: "string",
                    description: "The module's unique identifier",
                },
                updates: {
                    type: "array",
                    description:
                        "Array of trackable updates — each item targets an existing trackable by ID",
                    items: {
                        type: "object",
                        properties: {
                            id: {
                                type: "string",
                                description:
                                    "The trackable's unique identifier",
                            },
                            data: {
                                description:
                                    "The new data value to store for this trackable",
                            },
                        },
                        required: ["id", "data"],
                    },
                },
            },
            required: ["moduleId", "updates"],
        },
        handler: async (args: {
            moduleId: string;
            updates: { id: string; data: unknown }[];
        }) => {
            await updateModuleProgress(args.moduleId, args.updates);
            return { success: true, updatedAt: new Date().toISOString() };
        },
    },

    {
        name: "get_patient_states_history",
        description:
            "List all active states for a patient, ordered by date descending. " +
            "Useful for reviewing recovery trajectory over time.",
        inputSchema: {
            type: "object" as const,
            properties: {
                userId: {
                    type: "string",
                    description: "The patient's unique identifier",
                },
                limit: {
                    type: "number",
                    description:
                        "Maximum number of states to return (default 7, max 90)",
                },
            },
            required: ["userId"],
        },
        handler: async (args: { userId: string; limit?: number }) => {
            const limit = Math.min(args.limit ?? 7, 90);

            const states = await prisma.state.findMany({
                where: { userId: args.userId, isActive: true },
                orderBy: { dateCreated: "desc" },
                take: limit,
                include: {
                    modules: {
                        select: { id: true, type: true, summary: true },
                    },
                },
            });

            return states.map((s) => ({
                id: s.id,
                dateCreated: s.dateCreated,
                modules: s.modules,
            }));
        },
    },
];
