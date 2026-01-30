"use server"

import { auth } from "@/auth";
import { getActiveState, generateNewState, updateModuleProgress } from "@/lib/state/service";
import { Biometrics } from "@/lib/user/schema";
import { setProfile, generateUserProfile, getExistingOnboardingData, deleteOnboardingData, setBiometric, updateThread  } from "@/lib/user/service"
import { BaseMessage } from "./external/schemas/message";
import { Thread, ThreadContext } from "@/lib/external/schemas/thread";
import { prisma } from "./prisma";
import { compileExternal } from "./external/service";
import { State } from "./state/schemas/state";


// i love functors
export async function authenticatedAction<T>(
  callback: (userId: string) => Promise<T>
) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Unauthorized user attempted to call an action. This incident will be reported to ben."); // no, it wont
  }

  try {
    const result = await callback(userId);
    return { success: true, data: result };
  } catch (e: any) {
    console.error("Action Error:", e);
    return { success: false, error: e.message || "An unexpected error occurred." };
  }
}


export async function setProfileAction(profile: string) {
  return authenticatedAction(async (userId) => {return setProfile(userId, profile)})
}

export async function fetchStateAction(date: Date, admin_force: boolean = false) {
  return await authenticatedAction(async (userId): Promise<State> => {
    console.log('fetchstate')
    let state = await getActiveState(userId, date);
    if (!state || admin_force) {
      // Get necessary context for generation
      const user = await prisma.user.findUnique({ 
        where: { id: userId }, 
        include: { threads: { include: { messages: true } } } 
      });
      if (!user) throw new Error("User record missing");

      state = await generateNewState(userId, date);
    }
    return state;
  });
}

export async function updateProgressAction(
  moduleId: string, 
  updates: { id: string; data: any }[]
) {
  return authenticatedAction(async () => {
    // Note: If updateModuleProgress requires userId for security, add it here
    return await updateModuleProgress(moduleId, updates);
  });
}

export async function updateBiometricsAction(bio: Biometrics) {
  return authenticatedAction(async (userId) => {
    return await setBiometric(userId, bio);
  });
}

export async function getOnBoardingAction() {
  return authenticatedAction(async (userId) => {
    return await getExistingOnboardingData(userId);
  });
}

export async function deleteOnboardingDataAction() {
  authenticatedAction(
    async (userId) => {
      return await deleteOnboardingData(userId);
    });
}

export async function updateThreadAction({ threadId, threadType, messages }: {
  threadId: string | null;
  threadType: string | null;
  messages: BaseMessage[];
}) {
  return authenticatedAction(async (userId) => {
    return await updateThread(userId, threadId, threadType, messages);
  });
}

export async function generateUserProfileAction({thread, biometrics}: {
  thread: Thread,
  biometrics: Biometrics,
}) {
  // console.log('GENERATE USER PROFILE ACTION CALLED')
  // return 'test'
  return generateUserProfile({thread: thread, biometrics: biometrics})
}

export async function compileExternalAction(threadContext: ThreadContext, profile: string) {
  return authenticatedAction(async (userId) => {
    return await compileExternal(userId, threadContext, profile);
  });
}