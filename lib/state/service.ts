/**
 * Houses functionality to get, set and update progress of State.
 * Also to convert state
 */
import { LLMBlueprint, StateSchema, State, LLMBlueprintSchema } from './schemas/state';
import { prisma } from "@/lib/prisma";
import { createInitialProgress, createInitialChecklistState } from "@/lib/state/converters"
import { isDeepStrictEqual } from "util";
import { getNormalizedAppDate } from "@/lib/date-utils"
import { compileExternalAction } from '../actions';
import { External } from '../external/schemas/external';
import { generateObject } from 'ai';
import { getModel } from '../llm/model';
import { LLMGenerateState } from './services/full';
import { getModuleFromState } from '../utils';

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

export async function generateNewState(userId: string, date: Date) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { 
      threads: {
        include: { messages: true }
      }
    }
  });

  if (!user) {
    throw new Error("User not found"); 
  }

  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayActive = await getActiveState(userId, yesterday);
  console.log('generating new state')
  const causalStateId = yesterdayActive?.id?? null;
  
  const {threads, profile} = user
  const safeProfile = profile ?? "No profile data provided"
  const result = await compileExternalAction(threads, safeProfile)
  
  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to compile external context");
  }

  const x = result.data
  const generatedPlan = await LLMGenerateState(yesterdayActive, x, userId);
  console.log('generatedPlan?', generatedPlan)
  const state = await prisma.$transaction(async (tx) => {

    await tx.state.updateMany({
      where: { userId, dateCreated: date, isActive: true },
      data: { isActive: false }
    });

    return await tx.state.create({
      data: {
        userId,
        dateCreated: date,
        isActive: true,
        causalStateId: causalStateId,
        causalXId: x.id,
        modules: {
          create: Object.entries(generatedPlan).map(([type, blueprint]: [string, any]) => ({
            type,
            summary: blueprint.summary,
            plan: blueprint.plan,
            checklists: blueprint.checklists || [],
            progress: {
              create: {
                trackables: createInitialProgress(blueprint.plan),
                checklistState: blueprint.checklists ? createInitialChecklistState(blueprint.checklists) : {}
              }
            }
          }))
        }
      },
      include: { modules: { include: { progress: true } } }
    });
  });

  return StateSchema.parse(state)
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
