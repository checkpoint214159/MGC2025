"use server"

import { auth } from "@/auth";
import { getOrGenerateFullState, updateModuleProgress, getSymptomModule, updateSymptomChecklist, addSymptomLog, completeSymptomPeriod } from "@/lib/state/service";
import { ProfileInput } from "@/lib/profile/schema";
import { setProfile } from "@/lib/profile/generate"


export async function setProfileAction(data: ProfileInput, userId: string) {
    return setProfile(data, userId)
}

export async function fetchStateAction() {
    // try {
        const session = await auth();
        if (!session?.user?.id) throw new Error("Unauthorized");

        const data = await getOrGenerateFullState(session.user.id);
        return { success: true, data: data };
    // } catch (e) {
    //     return { success: false, error: "Failed to fetch state" };
    // }
}

export async function updateProgressAction(
  moduleId: string, 
  type: 'exercise' | 'nutrition' | 'sleep',
  updates: { id: string; data: any }[]
) {
  try {
    const updated = await updateModuleProgress(moduleId, type, updates);
    // console.log('udpated?', updated)
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateSymptomChecklistAction(
  moduleId: string,
  period: 'morning' | 'evening',
  itemId: string,
  response: boolean
) {
  try {
    await updateSymptomChecklist(moduleId, period, itemId, response);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function addSymptomLogAction(
  moduleId: string,
  period: 'morning' | 'evening',
  logEntry: { id: string; site: string; description: string; intensity: number; timestamp: string }
) {
  try {
    await addSymptomLog(moduleId, period, logEntry);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function completeSymptomPeriodAction(
  moduleId: string,
  period: 'morning' | 'evening'
) {
  try {
    await completeSymptomPeriod(moduleId, period);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
