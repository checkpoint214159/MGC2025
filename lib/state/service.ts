/**
 * Houses functionality to get, set and update progress of State.
 * Also to convert state
 */
import { StateSchema, State } from './schemas/state';
import { prisma } from "@/lib/prisma";
import { isDeepStrictEqual } from "util";
import { getNormalizedAppDate } from "@/lib/date-utils";
import { stateGenerationGraph } from './graph/graph';

const schema = StateSchema

export async function getActiveState(userId: string, date: Date): Promise<State | null> {
  const state = await prisma.state.findFirst({
    where: {
      userId: userId,
      dateCreated: date,
      isActive: true 
    },
    include: {
      modules: { include: { progress: true } },
      causalX: true,
    }
  });

  if (state) {
    return StateSchema.parse(state)
  } else {
    return null  // really what am i even doing
  }
}

/**
 * generateNewState: Orchestrates daily state generation via LangGraph
 *
 * 💡 Refactoring note: This function was previously a monolithic sequence of:
 *   1. Fetch user + yesterday's state
 *   2. Compile external context
 *   3. Call Promise.all to generate all modules in parallel
 *   4. Save to DB in a transaction
 *
 * Now all orchestration is handled by stateGenerationGraph (LangGraph).
 * This function is a thin wrapper that invokes the graph and returns the result.
 *
 * The graph takes care of:
 *   - load_context: steps 1-2 above
 *   - dispatch + parallel generate_module: step 3 above
 *   - save_state: step 4 above
 */
export async function generateNewState(userId: string, date: Date): Promise<State> {
  console.log("generating new state via LangGraph");

  // Invoke the graph with initial inputs.
  // No thread_id or checkpointer config needed — state generation is one-shot.
  const result = await stateGenerationGraph.invoke({
    userId,
    date,
  });

  if (!result.savedState) {
    throw new Error(
      "State generation graph completed without producing a savedState. Graph may have failed silently."
    );
  }

  console.log("state generation complete via LangGraph");
  return result.savedState;
}


type ModuleType = 'NUTRITION' | 'EXERCISE'; 

export async function getModule(userId: string, type: ModuleType) {
  const date = await getNormalizedAppDate();

  // We find the module directly using the composite filter
  return await prisma.module.findFirst({
    where: {
      type: type,
      state: {
        userId: userId,
        dateCreated: date,
        isActive: true
      }
    },
    include: { progress: true }
  });
}

export async function updateModuleProgress(
  moduleId: string,
  updates: { id: string; data: any }[]
) {
  
  const currentRecord = await prisma.progress.findUnique({
    where: { moduleId },
  });

  if (!currentRecord) {
    throw new Error(`Progress record for module ${moduleId} not found.`);
  }

  // Cast trackables for logic, though Zod will handle the final safety
  const currentTrackables = currentRecord.trackables as any[];

  // 2. Map and Merge
  const updatedTrackables = currentTrackables.map((existing) => {
    const update = updates.find((u) => u.id === existing.id);
    return update ? { ...existing, data: update.data } : existing;
  });

  // 3. Validation Logic
  const updateIds = updates.map(u => u.id);
  const existingIds = currentTrackables.map(t => t.id);
  const invalidIds = updateIds.filter(id => !existingIds.includes(id));

  if (invalidIds.length > 0) {
    throw new Error(`Invalid trackable IDs: ${invalidIds.join(", ")}`);
  }

  // 4. Optimization: Skip DB call if nothing changed
  if (isDeepStrictEqual(currentTrackables, updatedTrackables)) {
    return currentRecord;
  }

  // 5. Save the JSON back to the unified Progress table
  return await prisma.progress.update({
    where: { moduleId },
    data: { trackables: updatedTrackables },
  });
}
