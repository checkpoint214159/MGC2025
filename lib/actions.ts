"use server"

import { auth } from "@/auth";
import { getOrGenerateFullState, updateModuleProgress } from "@/lib/state/service";
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
  type: 'exercise' | 'nutrition', 
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
