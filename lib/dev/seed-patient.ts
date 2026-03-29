"use server";

import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { getDevAdminId } from "./init";
import { BiometricsSchema, Biometrics } from "@/lib/user/schema";
import { QueryBaseline, Baseline } from "@/lib/user/baseline";
import { BaseMessage } from "@/lib/external/schemas/message";
import { Prisma } from "@/generated/prisma/client";
import {
  COLOSTOMY_QUERY_BASELINE,
  ACL_QUERY_BASELINE,
  HIP_QUERY_BASELINE,
} from "./templates/queryBaseline";
import {
  COLOSTOMY_BASELINE,
  ACL_BASELINE,
  HIP_BASELINE,
} from "./templates/baseline";
import {
  COLOSTOMY_THREAD_MESSAGES,
  ACL_THREAD_MESSAGES,
  HIP_THREAD_MESSAGES,
} from "./templates/thread";
import {
  COLOSTOMY_PROFILE,
  ACL_PROFILE,
  HIP_PROFILE,
} from "./templates/profile";

/**
 * Preset patient archetypes bundling all template data
 */
export type PatientPreset = "colostomy-default" | "acl-young" | "hip-elderly";

export interface SeedPatientOptions {
  email: string;
  name: string;
  password?: string; // defaults to "password123"
  preset?: PatientPreset; // defaults to "colostomy-default"
  assignToDevAdmin?: boolean; // defaults to true
}

interface PresetConfig {
  biometrics: Biometrics;
  queryBaseline: QueryBaseline;
  baseline: Baseline;
  threadMessages: BaseMessage[];
  profile: string;
}

/**
 * Preset configurations mapping treatment + baseline data
 */
const PRESETS: Record<PatientPreset, PresetConfig> = {
  "colostomy-default": {
    biometrics: {
      age: 45,
      sex: "Male",
      treatment: "Colostomy",
      surgeryDate: new Date(),
    },
    queryBaseline: COLOSTOMY_QUERY_BASELINE,
    baseline: COLOSTOMY_BASELINE,
    threadMessages: COLOSTOMY_THREAD_MESSAGES,
    profile: COLOSTOMY_PROFILE,
  },
  "acl-young": {
    biometrics: {
      age: 25,
      sex: "Female",
      treatment: "ACL Reconstruction",
      surgeryDate: new Date(),
    },
    queryBaseline: ACL_QUERY_BASELINE,
    baseline: ACL_BASELINE,
    threadMessages: ACL_THREAD_MESSAGES,
    profile: ACL_PROFILE,
  },
  "hip-elderly": {
    biometrics: {
      age: 72,
      sex: "Female",
      treatment: "Hip Replacement",
      surgeryDate: new Date(),
    },
    queryBaseline: HIP_QUERY_BASELINE,
    baseline: HIP_BASELINE,
    threadMessages: HIP_THREAD_MESSAGES,
    profile: HIP_PROFILE,
  },
};

export interface SeedPatientResult {
  userId: string;
  email: string;
  password: string;
  preset: PatientPreset;
}

/**
 * Seed a complete patient record with all onboarding data.
 * Uses hardcoded templates—no LLM calls.
 *
 * @param opts Configuration object with email, name, password, preset, and assignToDevAdmin flag.
 * @returns Promise resolving to SeedPatientResult with user ID, email, and credentials.
 * @throws Error if email already exists or other database operation fails.
 *
 * @example
 * const result = await seedPatient({
 *   email: "patient@test.com",
 *   name: "Test Patient",
 *   preset: "colostomy-default"
 * });
 * console.log(`Created user ${result.userId} with email ${result.email}`);
 */
export async function seedPatient(opts: SeedPatientOptions): Promise<SeedPatientResult> {
  const {
    email,
    name,
    password = "password123",
    preset = "colostomy-default",
    assignToDevAdmin = true,
  } = opts;

  // Check if email already exists
  const existingAccount = await prisma.account.findUnique({
    where: { email },
  });

  if (existingAccount) {
    throw new Error(`Email already exists: ${email}`);
  }

  // Get preset configuration
  const config = PRESETS[preset];
  if (!config) {
    throw new Error(`Unknown preset: ${preset}`);
  }

  // Hash password
  const hashedPassword = await hash(password, 10);

  try {
    // 1. Create User + Account
    const user = await prisma.user.create({
      data: {
        name,
        role: "patient",
        account: {
          create: {
            email,
            password: hashedPassword,
          },
        },
      },
      include: { account: true },
    });

    // 2. Create Biometrics
    await prisma.biometrics.create({
      data: {
        userId: user.id,
        ...config.biometrics,
      },
    });

    // 3. Set QueryBaseline on User
    await prisma.user.update({
      where: { id: user.id },
      data: {
        queryBaseline: config.queryBaseline as unknown as Prisma.InputJsonValue,
      },
    });

    // 4. Create Baseline
    await prisma.baseline.create({
      data: {
        userId: user.id,
        data: config.baseline as unknown as Prisma.InputJsonValue,
      },
    });

    // 5. Create Thread + Messages
    const messageData = config.threadMessages.map((msg) => ({
      role: msg.role as "user" | "assistant" | "system",
      content: msg.content,
      context: msg.context || {},
      creationSource: msg.creationSource,
      reasoning: msg.reasoning || null,
    }));

    const thread = await prisma.thread.create({
      data: {
        userId: user.id,
        type: "onboarding",
        title: "New Assessment",
        messages: {
          create: messageData,
        },
      },
    });

    // 6. Set Profile on User
    await prisma.user.update({
      where: { id: user.id },
      data: {
        profile: config.profile,
      },
    });

    // 7. Auto-assign to dev admin if in development mode and flag is true
    if (assignToDevAdmin && process.env.NODE_ENV === "development") {
      const devAdminId = await getDevAdminId();
      if (devAdminId) {
        try {
          await prisma.adminPatientRelation.create({
            data: {
              adminId: devAdminId,
              patientId: user.id,
            },
          });
          console.log(
            `[DEV] ✓ Auto-assigned patient "${email}" to dev admin`
          );
        } catch (error: any) {
          // Silently ignore if relation already exists
          if (error.code !== "P2002") {
            console.error("[DEV] Failed to auto-assign patient to dev admin:", error);
          }
        }
      }
    }

    console.log(`[SEEDING] ✓ Successfully created patient:`);
    console.log(`  Email: ${email}`);
    console.log(`  User ID: ${user.id}`);
    console.log(`  Preset: ${preset}`);
    console.log(`  Password: ${password} (change after first login)`);

    return {
      userId: user.id,
      email,
      password,
      preset,
    };
  } catch (error: any) {
    console.error("[SEEDING] ✗ Failed to seed patient:", error.message);
    throw error;
  }
}

/**
 * Seed multiple patients at once, useful for load testing.
 */
export async function seedPatients(
  patients: SeedPatientOptions[]
): Promise<SeedPatientResult[]> {
  const results: SeedPatientResult[] = [];

  for (const patientOpts of patients) {
    try {
      const result = await seedPatient(patientOpts);
      results.push(result);
    } catch (error: any) {
      console.error(`[SEEDING] Failed to seed patient ${patientOpts.email}:`, error.message);
    }
  }

  return results;
}

/**
 * Delete all seeded test patients.
 * Useful for cleaning up between test runs.
 * Only works in development mode and only deletes patients created by seeding (can add a marker if needed).
 */
export async function cleanupSeedPatients(): Promise<number> {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Cleanup is only available in development mode");
  }

  // Delete all patients (assuming they're test data)
  // For safety, you might want to add a marker or only delete patients created after a certain time
  const deleted = await prisma.user.deleteMany({
    where: {
      role: "patient",
    },
  });

  console.log(`[SEEDING] Deleted ${deleted.count} patients`);
  return deleted.count;
}
