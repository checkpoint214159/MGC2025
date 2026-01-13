"use server"

import { auth } from "@/auth";
import { getOrGenerateFullState, updateModuleProgress } from "@/lib/state/service";
import { Biometrics } from "@/lib/profile/schema";
import { setProfile, generateUserProfile  } from "@/lib/profile/generate"
import { getExistingOnboardingData, setBiometric, updateThread } from "./llm/service";
import { BaseMessage } from "./external/schemas/message";
import { Thread } from "@/lib/external/schemas/thread";


export async function setProfileAction(userId: string, profile: string) {
    return setProfile(userId, profile)
}

export async function fetchStateAction(date: Date) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const data = await getOrGenerateFullState(session.user.id, date);
  return { success: true, data: data };
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

export async function updateBiometricsAction(userId: string, bio: Biometrics) {
  return setBiometric(userId, bio)
}

export async function getOnBoardingAction(userId: string) {
  return getExistingOnboardingData(userId)
}

export async function updateThreadAction({ userId, threadId, threadType, messages }: {
  userId: string;
  threadId: string | null;
  threadType: string | null;
  messages: BaseMessage[];
}) {
  return updateThread(userId, threadId, threadType, messages)
}

export async function generateUserProfileAction({thread, bio}: {
  thread: Thread,
  bio: Biometrics,
}) {
  // console.log('GENERATE USER PROFILE ACTION CALLED')
  // return 'test'
  return generateUserProfile({thread: thread, bio: bio})
}
