import { prisma } from "@/lib/prisma";
import { StateSchema } from "@/lib/state/schemas/state";
import {
  createInitialProgress,
  createInitialChecklistState,
} from "@/lib/state/converters";
import { StateGenerationLangGraphState } from "@/lib/state/graph/annotation";

/**
 * Node: save_state
 *
 * Maps to the prisma.$transaction block at the end of generateNewState() in lib/state/service.ts:
 * - Deactivate any existing active states for today
 * - Create a new State record with all modules + progress
 * - Set causal links (previousState, external)
 *
 * Returns:
 *   { savedState }
 *
 * 💡 LangGraph: This node is called AFTER all generate_module invocations complete (fan-in).
 * The generatedModules field in state will have been merged to contain all modules.
 * By the time this node runs, state.generatedModules[key] is populated for every key.
 */
export async function saveStateNode(
  state: StateGenerationLangGraphState
): Promise<Partial<StateGenerationLangGraphState>> {
  if (!state.external) {
    throw new Error("External context missing — graph state corrupted");
  }

  // Batch transaction (array form). Neon's HTTP adapter (used on Cloudflare
  // Workers) does NOT support the interactive callback form. These two ops are
  // independent (the create doesn't read the updateMany result), so batching is
  // equivalent and still atomic.
  const [, savedState] = await prisma.$transaction([
    // Deactivate any existing state for today (one active state per day per user)
    prisma.state.updateMany({
      where: { userId: state.userId, dateCreated: state.date, isActive: true },
      data: { isActive: false },
    }),
    // Create the new state record with all modules
    prisma.state.create({
      data: {
        userId: state.userId,
        dateCreated: state.date,
        isActive: true,
        causalStateId: state.previousState?.id ?? null,
        causalXId: state.external!.id, // external guaranteed to exist (checked above)
        modules: {
          create: Object.entries(state.generatedModules).map(
            ([type, blueprint]: [string, any]) => ({
              type,
              summary: blueprint.summary,
              plan: blueprint.plan,
              checklists: blueprint.checklists || [],
              progress: {
                create: {
                  trackables: createInitialProgress(blueprint.plan),
                  checklistState: blueprint.checklists
                    ? createInitialChecklistState(blueprint.checklists)
                    : {},
                },
              },
            })
          ),
        },
      },
      include: { modules: { include: { progress: true } } },
    }),
  ]);

  return { savedState: StateSchema.parse(savedState) };
}
