"use server"

import { auth } from "@/auth";
import { getActiveState, generateNewState, updateModuleProgress } from "@/lib/state/service";
import { Biometrics } from "@/lib/user/schema";
import { setProfile,
  getExistingOnboardingData, deleteOnboardingData,
  setBiometric,
  updateThread,
  getQueryBaseline, setQueryBaseline, setBaseline, getBaseline,
  deleteBiometrics, deleteBaselines, deleteOnboardingThread  } from "@/lib/user/service"
import { BaseMessage } from "./external/schemas/message";
import { Thread, ThreadContext } from "@/lib/external/schemas/thread";
import { prisma } from "./prisma";
import { compileExternal } from "./external/service";
import { State } from "./state/schemas/state";
import { Baseline, QueryBaseline } from "./user/baseline";
import { requireRole, requirePatientAccess, getAdminManagedPatientIds } from "@/lib/auth-utils";
import { semanticSearch } from "@/lib/rag/service";
import { MetadataFilter } from "@/lib/rag/schemas/rag";
import { selectAndBuildQuery } from "@/lib/rag/rag_query";
import { generateQueryBaseline, generateBaseline } from "@/lib/onboarding/baselines"
import { generateUserProfile } from "@/lib/onboarding/profile"
import { getOnboardingState, startOnboarding, resumeOnboarding } from "@/lib/onboarding/service"


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

export async function updateBiometricsAction(bio: Biometrics) {
  return authenticatedAction(async (userId) => {
    return await setBiometric(userId, bio);
  });
}

export async function generateQueryBaselineAction(biometrics: Biometrics) {
  return authenticatedAction(async (userId) => {
    return await generateQueryBaseline(userId, biometrics);
  });
}

export async function setQueryBaselineAction(queryBaseline: QueryBaseline) {
  return authenticatedAction(async (userId) => {
    return await setQueryBaseline(userId, queryBaseline);
  })
}
export async function getQueryBaselineAction() {
  return authenticatedAction(async (userId) => {
    return await getQueryBaseline(userId);
  })
}

export async function generateBaselineAction(biometrics: Biometrics, responses: Record<string, number>, queryBaseline: QueryBaseline) {
  return authenticatedAction(async (userId) => {
    return await generateBaseline(biometrics, responses, queryBaseline);
  });
}

export async function setBaselineAction(queryBaseline: Baseline) {
  return authenticatedAction(async (userId) => {
    return await setBaseline(userId, queryBaseline);
  })
}
export async function getBaselineAction() {
  return authenticatedAction(async (userId) => {
    return await getBaseline(userId);
  })
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

export async function generateUserProfileAction({thread, biometrics, baseline}: {
  thread: Thread,
  biometrics: Biometrics,
  baseline: Baseline
}) {
  return authenticatedAction(async (userId) => {
    return generateUserProfile({thread: thread, biometrics: biometrics, baseline: baseline})
  })
}

export async function getOnBoardingAction() {
  return authenticatedAction(async (userId) => {
    return await getExistingOnboardingData(userId);
  });
}

// ---- Onboarding graph actions ----

export async function getOnboardingStateAction() {
  return authenticatedAction(async (userId) => {
    return await getOnboardingState(userId);
  });
}

export async function startOnboardingAction() {
  return authenticatedAction(async (userId) => {
    return await startOnboarding(userId);
  });
}

export async function resumeOnboardingAction(input: any) {
  return authenticatedAction(async (userId) => {
    return await resumeOnboarding(userId, input);
  });
}

export async function deleteOnboardingDataAction() {
  authenticatedAction(
    async (userId) => {
      return await deleteOnboardingData(userId);
    });
}

export async function deleteBiometricsAction() {
  authenticatedAction(
    async (userId) => {
      return await deleteBiometrics(userId);
    });
}

export async function deleteBaselinesAction() {
  authenticatedAction(
    async (userId) => {
      return await deleteBaselines(userId);
    });
}

export async function deleteOnboardingThreadAction() {
  authenticatedAction(
    async (userId) => {
      return await deleteOnboardingThread(userId);
    });
}


export async function compileExternalAction(threadContext: ThreadContext, profile: string) {
  return authenticatedAction(async (userId) => {
    return await compileExternal(userId, threadContext, profile);
  });
}


export async function fetchStateAction(date: Date, admin_force: boolean = false) {
  // server sided fetch state, which checks if state exists and is active for the user,
  // and if not generates a new one with the appropriate context
  // note that forcing state generation is an admin thing, otherwise behaviour for client components
  // to 'ask to generate state' is not supported. That should be handled by server.

  return await authenticatedAction(async (userId): Promise<State> => {
    console.log("[fetchStateAction] 🚀 Starting - userId:", userId, "date:", date, "admin_force:", admin_force);
    let state = await getActiveState(userId, date);
    if (!state || admin_force) {
      console.log("[fetchStateAction] ⚠️ No state found, calling generateNewState");
      // Get necessary context for generation
      const user = await prisma.user.findUnique({ 
        where: { id: userId }, 
        include: { threads: { include: { messages: true } } } 
      });
      if (!user) throw new Error("User record missing");

      state = await generateNewState(userId, date);
      console.log("[fetchStateAction] ✅ State generated successfully");
    } else {
      console.log("[fetchStateAction] ✅ State already exists, returning");
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

// ============= ADMIN-ONLY ACTIONS =============

/**
 * Get all patient IDs that the logged-in admin manages.
 * Requires admin role.
 */
export async function getAdminManagedPatientsAction() {
  return authenticatedAction(async (userId) => {
    await requireRole('admin');
    return await getAdminManagedPatientIds(userId);
  });
}


export async function getPatientDetailsForAdminAction(patientId: string) {
  return authenticatedAction(async (userId) => {
    await requireRole('admin');
    await requirePatientAccess(userId, patientId);

    const patient = await prisma.user.findUnique({
      where: { id: patientId },
      include: {
        biometric: true,
        baseline: true,
        threads: {
          include: {
            messages: {
              orderBy: { createdAt: 'asc' }
            }
          }
        },
        states: {
          where: { isActive: true },
          include: {
            modules: {
              include: {
                progress: true
              }
            }
          },
          take: 1
        }
      }
    });

    if (!patient) {
      throw new Error(`Patient ${patientId} not found`);
    }

    return patient;
  });
}

/**
 * Get onboarding/conversation threads for a patient.
 * Requires admin role and admin must manage the specified patient.
 */
export async function getPatientThreadsForAdminAction(patientId: string) {
  return authenticatedAction(async (userId) => {
    await requireRole('admin');
    await requirePatientAccess(userId, patientId);

    const threads = await prisma.thread.findMany({
      where: {
        userId: patientId,
        type: 'onboarding' // Can expand to include other types if needed
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    return threads;
  });
}

/**
 * Assign (or reassign) a patient to an admin.
 * Requires admin role. Only available in development mode.
 * Logs a warning whenever this is called.
 */
export async function assignPatientToAdminAction(patientId: string, adminId: string) {
  if (process.env.NODE_ENV !== "development") {
    return { success: false, error: "This action is only available in development mode" };
  }

  return authenticatedAction(async (userId) => {
    await requireRole("admin");

    // Verify that we're not assigning to a non-existent admin
    const adminExists = await prisma.user.findUnique({
      where: { id: adminId },
    });

    if (!adminExists || adminExists.role !== "admin") {
      throw new Error("Admin not found or user is not an admin");
    }

    // Verify patient exists
    const patientExists = await prisma.user.findUnique({
      where: { id: patientId },
    });

    if (!patientExists || patientExists.role !== "patient") {
      throw new Error("Patient not found or user is not a patient");
    }

    // Delete existing admin relation if one exists
    const existing = await prisma.adminPatientRelation.findFirst({
      where: { patientId },
    });

    if (existing) {
      await prisma.adminPatientRelation.delete({
        where: { id: existing.id },
      });
    }

    // Create new relation
    const relation = await prisma.adminPatientRelation.create({
      data: {
        adminId,
        patientId,
      },
      include: {
        admin: { select: { name: true, id: true } },
        patient: { select: { name: true, id: true } },
      },
    });

    console.warn(
      `[DEV] ⚠️  Reassigned patient "${relation.patient.name}" (${patientId}) ` +
      `to admin "${relation.admin.name}" (${adminId})`
    );

    return relation;
  });
}


export async function semanticSearchAction(
  query: string,
  options?: {
    topK?: number;
    filter?: MetadataFilter;
    namespace?: string;
    rerank? : boolean;
  }
) {
  return authenticatedAction(async () => {
    return await semanticSearch(query, options?.topK, options?.filter, options?.namespace, options?.rerank);
  });
}

/**
 * Advanced semantic search with intelligent query optimization.
 * Automatically generates optimized search queries based on patient context.
 *
 * Uses hybrid strategy:
 * 1. Attempts to generate context-aware query using LLM (dynamic)
 * 2. Falls back to template-based query on LLM failure (hardcoded)
 * 
 * Useful for: patient-specific recovery guidance, symptom-based searches,
 * adaptive query generation without manual intervention
 */
export async function semanticSearchWithContextAction(
  queryContext: {
    surgeryType: string;
    recoveryWeek: number;
    biometrics?: Record<string, number>;
    symptoms?: string[];
    additionalContext?: string;
  },
  options?: {
    topK?: number;
    filter?: MetadataFilter;
    namespace?: string;
    disableDynamicQuery?: boolean;
  }
) {
  return authenticatedAction(async () => {
    // Step 1: Intelligently build query (dynamic with fallback to hardcoded)
    const queryResult = await selectAndBuildQuery(queryContext, {
      disableDynamic: options?.disableDynamicQuery,
      devMode: process.env.NODE_ENV === "development",
    });

    // Step 2: Execute semantic search with the generated query
    const searchResults = await semanticSearch(
      queryResult.query,
      options?.topK,
      options?.filter,
      options?.namespace
    );

    // Step 3: Return enriched response with query metadata
    return {
      ...searchResults,
      queryMetadata: {
        source: queryResult.source,
        generatedQuery: queryResult.query,
        fallbackReason: queryResult.fallbackReason,
      },
    };
  });
}
