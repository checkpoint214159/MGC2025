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

const EXAMPLE_WIDGET_OUTPUT: LLMBlueprint = {
    exercise: {
      "type": "EXERCISE",
      "summary": "Focus on circulation and light respiratory recovery.",
      "plan": [
        {
          "id": "ankles dd-mm-yy",
          "meta": {
            "type": "ankles",
            "name": "ankles recovery",
            "intensity": "blue",
            "precaution": "Avoid if you feel sharp calf pain."
          },
          "data": {
            "ankle pumps": {"goal":30, "value":0, "unit":'reps'},
            "calf raises": {"goal":30, "value":0, "unit":'reps'}
          }
        },
        {
          "id": "mobility dd-mm-yy",
          "meta": {
            "type": "mobility",
            "name": "mobility recovery",
            "intensity": "orange",
            "precaution": "Must have a caregiver present."
          },
          "data": {
            "hallway walks": {"goal":30, "value":0, "unit":'minutes'},
            "knee raises": {"goal":20, "value":0, "unit":'reps'}
          }
          
        }
      ],
      "checklists": [],
    },
    nutrition: {
      "type": "NUTRITION",
      "summary": "Support tissue repair with high protein and controlled sodium intake.",
      "plan": [
        {
          "id": "daily-macros",
          "meta": {
            "type": "macros",
            "importance": "Crucial for muscle synthesis"
          },
          "data": {
            "calories": {goal:1800, value:0, unit: "grams",},
            "protein": {goal:80, value:0, unit: "grams"},
            "carbs": {goal:200, value:0, unit: "grams"},
            "fats": {goal:50, value:0, unit: "grams"}
          }
        },
        {
          "id": "recovery-minerals",
          "meta": {
            "type": "minerals",
          },
          "data": {
            "sodium": {goal:3000, value:0, unit: "mg"},
            "potassium": {goal:2500, value:0, unit: "mg"},
            "calcium": {goal:1000, value:0, unit: "mg"}
          }
        }
      ],
      "checklists": [
        {
          "id": "nut-1",
          "name": "Electrolyte Drink (500ml)",
          "impact": { 
            "calories": 50, 
            "carbs": 12, 
            "sodium": 450 
          },
          "metadata": { 
            "message": "Prevents dehydration post-surgery" 
          }
        },
        {
          "id": "nut-2",
          "name": "Protein Shake",
          "impact": { 
            "protein": 25, 
            "calories": 250,
            "calcium": 150 
          },
          "metadata": { 
            "message": "Aids muscle and tissue repair" 
          }
        }
      ]
    }
  }
    // "symptoms": {
    //   "emergencyProtocol": "Call your surgeon immediately if fever exceeds 38.5°C or if you notice heavy bleeding.",
    //   "dailyChecks": [
    //     { "id": "sym-1", "label": "Is the incision site red or leaking?", "critical": true },
    //     { "id": "sym-2", "label": "Have you had a bowel movement today?", "critical": false },
    //     { "id": "sym-3", "label": "Rate your pain from 1-10", "critical": false }
    //   ]
    // }
//   }
// }

const schema = StateSchema

export async function getOrGenerateFullState(userId: string, date: Date) {
  // TODO: make it conditional whether we check for existence of progress, and whether
  // we make it too
    console.log('date??', date)
    const existing = await prisma.state.findUnique({
        where: { userId_dateCreated_isActive: { userId, dateCreated: date, isActive: true } },
        include: {
            modules: { include: { progress: true } },
        }
    });

    if (existing) return existing;

    const prev_date = new Date(date);
    prev_date.setDate(prev_date.getDate() - 1);
    
    const prevRecord = await prisma.state.findUnique({
        where: { userId_dateCreated_isActive: { userId, dateCreated: prev_date, isActive: true } },
        include:{ modules: { include: { progress: true } } }
    });

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

    const {threads, profile} = user
    const x = await compileExternalAction(userId, threads, profile as unknown as string) // todo this is bad
    const generatedPlan = await LLMGenerateState(prevRecord as any, x, userId);

    return await prisma.state.create({
        data: {
            userId,
            dateCreated: date,
            isActive: true,
            causalStateId: prevRecord?.id,
            modules: {
              create: Object.entries(generatedPlan).map(([type, blueprint]: [string, any]) => ({
                type: type, // 'NUTRITION', 'EXERCISE'
                summary: blueprint.summary,
                plan: blueprint.plan,
                checklists: blueprint.checklists || [],
                progress: {
                  create: {
                    trackables: createInitialProgress(blueprint.plan),
                    // Only create checklist state if checklists exist
                    checklistState: blueprint.checklists 
                      ? createInitialChecklistState(blueprint.checklists) 
                      : {}
                  }
                }
              }))
            }
          },
    include: {
      modules: { include: { progress: true } }
    }
  });
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

export async function LLMGenerateState(
  in_state: State | null, 
  x: External, 
  userId: string 
) {
  // 1. Distill the ThreadContext into a readable transcript for the LLM
  // We prioritize the most recent messages if tokens are an issue
  const transcript = x.threadContext.map(thread => {
    const msgs = thread.messages?.map(m => `[${m.role.toUpperCase()}]: ${m.content}`).join("\n") || "No messages";
    return `### Thread: ${thread.title || 'General'}\n${msgs}`;
  }).join("\n\n---\n\n");

  const profile = x.profile

  const systemPrompt = `
    ROLE: You are a Senior Clinical Rehabilitation Specialist.
    TASK: Generate a "Recovery Blueprint" (JSON) for a patient based on their History Snapshot.

    INPUT DATA:
    1. PATIENT PROFILE: ${x.profile}
    2. CONVERSATION SNAPSHOT: This is a frozen record of recent patient interactions. 
       Analyze these for:
       - Reported pain levels or physical limitations.
       - Nutritional preferences or adherence issues.
       - Direct requests from the patient or doctor.

    OUTPUT INSTRUCTIONS:
    - Your goal is to output a "Blueprint" containing exactly 1-3 modules.
    - Each module must match the specific schema for NUTRITION, EXERCISE, etc.
    - If the history mentions pain, include a SYMPTOM_CHECKER or modify EXERCISE intensity.
    - If post-surgery (per profile), prioritize High-Protein NUTRITION goals.

    STRICT CONSTRAINTS:
    - Do NOT generate IDs or timestamps (these are system-managed).
    - Return ONLY valid JSON matching the provided schema.
  `;

  const { object } = await generateObject ({
    model: 'deepseek/deepseek-v3.2', // e.g., gpt-4o or deepseek-v3
    system: systemPrompt,
    prompt: `
      PREVIOUS STATE: ${in_state ? JSON.stringify(in_state.modules) : "No previous state. This is a fresh start."}
      USER PROFILE: ${profile}
      EVIDENCE LOG (Snapshot):
      ${transcript}
    `,
    schema: LLMBlueprintSchema, // This ensures the LLM sticks to your factory-built schema
  });

  const generatedPlan = LLMBlueprintSchema.parse(object)


  return generatedPlan;
}