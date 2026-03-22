// router used to generate new state.
import { StateBlueprint, StateSchema, State, StateBlueprintSchema } from './schemas/state';
import { prisma } from "@/lib/prisma";
import { createInitialProgress, createInitialChecklistState } from "@/lib/state/converters"
import { createInitialSymptomPeriods } from "@/lib/state/converters";
import { isDeepStrictEqual } from "util";

const EXAMPLE_WIDGET_OUTPUT: StateBlueprint = {
    "exercise": {
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
      ]
    },
    "nutrition": {
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
    },
    "sleep": {
      "summary": "Aim for 7-8 hours of uninterrupted sleep to support tissue repair.",
      "plan": [{
        "id": "sleep-daily",
        "meta": { "type": "sleep", "name": "Daily Sleep Log" },
        "data": {
          "hoursSlept": { "goal": 8, "value": 0, "unit": "hours" },
          "sleepQuality": { "goal": 8, "value": 0, "unit": "rating" },
          "disturbances": { "goal": 0, "value": 0, "unit": "count" }
        }
      }]
    },
    "symptoms": {
      "summary": "Monitor surgical site and track post-op symptoms.",
      "emergencyProtocol": "Call your surgeon immediately if fever exceeds 38.5°C or if you notice heavy bleeding.",
      "checklist": [
        { "id": "sym-1", "label": "Is the incision site red or leaking?", "critical": true, "response": null },
        { "id": "sym-2", "label": "Have you had a bowel movement today?", "critical": false, "response": null },
        { "id": "sym-3", "label": "Any nausea or vomiting?", "critical": false, "response": null }
      ]
    }
}

const schema = StateSchema

export async function getOrGenerateFullState(userId: string) {
  // TODO: make it conditional whether we check for existence of progress, and whether
  // we make it too
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const existing = await prisma.state.findUnique({
        where: { userId_dateCreated: { userId, dateCreated: today } },
        include: {
            exercise: { include: { progress: true } },
            nutrition: { include: { progress: true } },
            sleep: { include: { progress: true } },
            symptoms: { include: { progress: true } },
        }
    });

    if (existing) return existing;

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const prevRecord = await prisma.state.findUnique({
        where: { userId_dateCreated: { userId, dateCreated: yesterday } },
        include: { exercise: { include: { progress: true } }, nutrition: { include: { progress: true } }, sleep: { include: { progress: true } }, symptoms: { include: { progress: true } } }
    });

    const [ generatedPlan ] = await LLMGenerateState(prevRecord as any, null, userId);


    // create everything in one transaction
    // TODO this should be a seperate function? as in the messy accessing of nested things
    return await prisma.state.create({
        data: {
            userId,
            dateCreated: today,
            exercise: {
                create: {
                    summary: generatedPlan.exercise.summary,
                    plan: generatedPlan.exercise.plan as any,
                    progress: {
                        create: {
                            trackables : createInitialProgress(generatedPlan.exercise.plan)
                        }
                    }
                }
            },
            nutrition: {
                create: {
                    summary: generatedPlan.nutrition.summary,
                    plan: generatedPlan.nutrition.plan as any,
                    checklists: generatedPlan.nutrition.checklists as any,
                    progress: {
                        create: {
                            trackables: createInitialProgress(generatedPlan.nutrition.plan) as any,
                            checklistState: createInitialChecklistState(generatedPlan.nutrition.checklists) as any,
                          }
                    }
                }
            },
            ...(generatedPlan.sleep ? {
                sleep: {
                    create: {
                        summary: generatedPlan.sleep.summary,
                        plan: generatedPlan.sleep.plan as any,
                        progress: {
                            create: {
                                trackables: createInitialProgress(generatedPlan.sleep.plan)
                            }
                        }
                    }
                }
            } : {}),
            ...(generatedPlan.symptoms ? {
                symptoms: {
                    create: {
                        summary: generatedPlan.symptoms.summary,
                        emergencyProtocol: generatedPlan.symptoms.emergencyProtocol,
                        checklist: generatedPlan.symptoms.checklist as any,
                        progress: {
                            create: createInitialSymptomPeriods(generatedPlan.symptoms.checklist)
                        }
                    }
                }
            } : {}),
        },
        include: {
            exercise: { include: { progress: true } },
            nutrition: { include: { progress: true } },
            sleep: { include: { progress: true } },
            symptoms: { include: { progress: true } },
        }
    });
}

type ModuleType = 'exercise' | 'nutrition' | 'sleep';

export async function getModule(userId: string, type: ModuleType) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const stateRecord = await prisma.state.findUnique({
    where: { userId_dateCreated: { userId, dateCreated: today } },
    select: { id: true }
  });

  if (!stateRecord) return null;

  switch (type) {
    case 'exercise':
      return await prisma.exerciseModule.findUnique({
        where: { stateId: stateRecord.id },
        include: { progress: true }
      });
    case 'nutrition':
      return await prisma.nutritionModule.findUnique({
        where: { stateId: stateRecord.id },
        include: { progress: true }
      });
    case 'sleep':
      return await prisma.sleepModule.findUnique({
        where: { stateId: stateRecord.id },
        include: { progress: true }
      });
    default:
      throw new Error(`Unknown module type: ${type}`);
  }
}

const ProgressActions = {
  exercise: prisma.exerciseProgress,
  nutrition: prisma.nutritionProgress,
  sleep: prisma.sleepProgress,
} as const;



export async function updateModuleProgress(
  moduleId: string,
  type: 'exercise' | 'nutrition' | 'sleep',
  updates: { id: string; data: any }[]
) {
  const delegateProgress = ProgressActions[type] as any;

  // 1. Fetch current state
  const currentRecord = await delegateProgress.findUnique({
    where: { moduleId },
  });

  if (!currentRecord) throw new Error(`Progress record for module ${moduleId} not found.`);

  const currentTrackables = currentRecord.trackables as any[];
  // console.log('currentTrackables in updatemodule', currentTrackables[0].trackables)
  // 2. Map and Merge
  const updatedTrackables = currentTrackables.map((existing) => {
    const update = updates.find((u) => u.id === existing.id);
    if (update) {
      console.log('this has changes, updating:', existing.trackables, update.data)
      return { ...existing, data: update.data };
    }
    return existing;
  });
  // console.log('updatedTrackables in updatemodule', updatedTrackables[0].trackables)

  // 3. Validation: Check if we tried to update something that doesn't exist
  const updateIds = updates.map(u => u.id);
  const existingIds = currentTrackables.map(t => t.id);
  const invalidIds = updateIds.filter(id => !existingIds.includes(id));

  if (invalidIds.length > 0) {
    throw new Error(`Invalid trackable IDs: ${invalidIds.join(", ")}`);
  }
  
  // 4. Save only if changed
  if (isDeepStrictEqual(currentTrackables, updatedTrackables)) return currentRecord;

  return await delegateProgress.update({
    where: { moduleId },
    data: { trackables: updatedTrackables },
  });
}

async function LLMGenerateState(in_state: State | null, x: null, userId:string ) {
  /*
  Generates a target using LLM. This target state is of the same schema as
  our user state
  **/
  const outschema = StateBlueprintSchema
  const systemPrompt = `
    You are a medical recovery expert. Based on the patient's data,
    select recovery widgets from the available list.

    Available Widget Types:
    - EXERCISE_TRACKER: For physical movements or PT.
    - NUTRITION_PLAN: For dietary restrictions.
    - SLEEP_TRACKER: For sleep quality and duration monitoring.
    - SYMPTOM_CHECKER: For tracking pain or red flags.

    For NUTRITION_PLAN widgets, prioritize High-Protein targets (1.5g/kg) and Low-Residue diet items.
    Structure macros as a dictionary and micros as an array of electrolyte goals.

    Return ONLY the JSON structure.
  `;

//   const { target } = await generateObject({
//             model: "deepseek/deepseek-v3.2", // Use the same string as your chat
//             system: systemPrompt,
//             prompt: `Patient: ${age}yo ${sex}, Surgery: ${treatment}`,
//             schema: schema,
//         });
  const stateBlueprint: StateBlueprint = EXAMPLE_WIDGET_OUTPUT

  return [ stateBlueprint ]
}

export async function getSymptomModule(userId: string) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const stateRecord = await prisma.state.findUnique({
    where: { userId_dateCreated: { userId, dateCreated: today } },
    select: { id: true }
  });

  if (!stateRecord) return null;

  return await prisma.symptomModule.findUnique({
    where: { stateId: stateRecord.id },
    include: { progress: true }
  });
}

export async function updateSymptomChecklist(
  moduleId: string,
  period: 'morning' | 'evening',
  itemId: string,
  response: boolean
) {
  const current = await prisma.symptomProgress.findUnique({
    where: { moduleId },
  });
  if (!current) throw new Error(`Symptom progress for module ${moduleId} not found.`);

  const periodData = current[period] as any;
  const updatedChecklist = periodData.checklist.map((item: any) =>
    item.id === itemId ? { ...item, response } : item
  );

  return await prisma.symptomProgress.update({
    where: { moduleId },
    data: {
      [period]: { ...periodData, checklist: updatedChecklist },
    },
  });
}

export async function addSymptomLog(
  moduleId: string,
  period: 'morning' | 'evening',
  logEntry: { id: string; site: string; description: string; intensity: number; timestamp: string }
) {
  const current = await prisma.symptomProgress.findUnique({
    where: { moduleId },
  });
  if (!current) throw new Error(`Symptom progress for module ${moduleId} not found.`);

  const periodData = current[period] as any;
  const updatedLogs = [...periodData.logs, logEntry];

  return await prisma.symptomProgress.update({
    where: { moduleId },
    data: {
      [period]: { ...periodData, logs: updatedLogs },
    },
  });
}

export async function completeSymptomPeriod(
  moduleId: string,
  period: 'morning' | 'evening'
) {
  const current = await prisma.symptomProgress.findUnique({
    where: { moduleId },
  });
  if (!current) throw new Error(`Symptom progress for module ${moduleId} not found.`);

  const periodData = current[period] as any;

  return await prisma.symptomProgress.update({
    where: { moduleId },
    data: {
      [period]: { ...periodData, completed: true },
    },
  });
}

