import { generateObject } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Biometrics } from "./schema";
import { Thread, ThreadSchema } from "@/lib/external/schemas/thread";
import { BaseMessage } from "@/lib/external/schemas/message";
import { Baseline, QueryBaseline } from "./baseline";
import { NullableJsonNullValueInput } from "@/generated/prisma/internal/prismaNamespace";
import { Prisma } from "@/generated/prisma/client";

export interface ProfileInput {
  thread: Thread;
  biometrics: Biometrics;
  baseline: Baseline;
}

// ------------------- BIOMETRICS -------------------

export async function setBiometric(userId: string, bio: Biometrics) {
  return await prisma.biometrics.upsert({
    where: { 
      userId: userId 
    },
    update: {
      age: bio.age,
      sex: bio.sex,
      treatment: bio.treatment,
      surgeryDate: bio.surgeryDate,
    },
    create: {
      userId: userId, // Ensure the relation is linked on creation
      age: bio.age,
      sex: bio.sex,
      treatment: bio.treatment,
      surgeryDate: bio.surgeryDate,
    },
  });
}

export async function deleteBiometrics(userId: string) {
  await prisma.user.update({
    where: {id: userId},
    data: {
      biometric: {delete: true},
    }
  })
}



export async function setQueryBaseline(userId: string, queryBaseline: QueryBaseline) {
  return await prisma.user.update({
    where: {id: userId},
    data: {
      queryBaseline: queryBaseline as unknown as Prisma.InputJsonValue,
    }
  })
}

export async function getQueryBaseline(userId: string) {
  return await prisma.user.findUnique({
    where: {id: userId},
    select: {
      queryBaseline: true
    }
  })
}



export async function setBaseline(userId: string, baselineData: Baseline) {
  return await prisma.baseline.upsert({
    where: { userId: userId },
    update: { data: baselineData as any },
    create: {
      userId: userId,
      data: baselineData as any,
    },
  });
}

export async function getBaseline(userId: string) {
  return await prisma.user.findUnique({
    where: {id: userId},
    select: {
      baseline: true
    }
  })
}

export async function deleteBaselines(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { baseline: true, queryBaseline: true }
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      baseline: user?.baseline ? { delete: true } : undefined,
      queryBaseline: null as unknown as NullableJsonNullValueInput,
    }
  });
}



// ------------------- THREADS -------------------

type MessageRole = 'user' | 'assistant' | 'system';
export async function updateThread(
  userId: string,
  threadId: string | null,
  threadType: string | null = null,
  messages: BaseMessage[] = [],
) {
  const messageCreateData = messages.map((msg) => ({
    role: msg.role as MessageRole,
    content: msg.content,
    context: msg.context || {},
    creationSource: msg.creationSource,
    reasoning: msg.reasoning || null,
  }));

  if (threadId) {
    return await prisma.thread.update({
      where: { id: threadId },
      data: {
        messages: {
          create: messageCreateData,
        },
      },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });
  } else if (!threadType) {
    throw new Error('Invalid argument. If threadId is null, i.e create new thread, must provide thread type.')
  }
  const t = await prisma.thread.create({
    data: {
      userId,
      type: threadType,
      title: "New Assessment",
      messages: {
        create: messageCreateData,
      },
    },
    include: { messages: { orderBy: { createdAt: 'asc' } } }
  });

  const thread = ThreadSchema.parse(t)
  if (!thread) {
    throw new Error('thread is undefined')
  }
  return thread
}



// ------------------- PROFILE -------------------

export async function setProfile(userId: string, profile: string) {
  return await prisma.user.update({
    where: { id: userId },
    data: {
      profile: profile,
    },
  });
}

export async function deleteProfile(userId: string) {
  return await prisma.user.update({
    where: { id: userId },
    data: {
      profile: null,
    },
  });
}


export async function getExistingOnboardingData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      biometric: true,
      threads: {
        where: { type: "onboarding" },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
        take: 1
      },
      baseline: true
    }
  });

  return {
    biometrics: user?.biometric || null,
    activeThread: user?.threads[0] || null,
    baseline: user?.baseline || null,
    queryBaseline: user?.queryBaseline || null,
  };
}

export async function deleteOnboardingData(userId: string) {
  await Promise.all([
    deleteBaselines(userId),
    deleteBiometrics(userId),
    deleteOnboardingThread(userId),
    deleteProfile(userId),
  ])
}

export async function deleteOnboardingThread(userId: string) {
  await prisma.user.update({
    where: {id: userId},
    data: {
      threads: {
        deleteMany: {
          type: "onboarding"
        }
      },
    }
  })
}





const EXAMPLE_BASELINE_QUERY_OUTPUT: QueryBaseline = {
  "axes": {
    "biomechanical": {
      "axisType": "A",
      "entries": [
        {
          "code": "s540",
          "domain": "Structures of the Digestive System",
          "indicator": "Abdominal Wall Integrity",
          "value": 10,
          "unit": "1-10 scale",
          "qualifier": 0,
          "assessment": "Pre-operative baseline: No herniation or muscular weakness reported in the abdominal wall."
        },
        {
          "code": "b280",
          "domain": "Sensory Functions",
          "indicator": "Abdominal Pain",
          "value": 0,
          "unit": "1-10 scale",
          "qualifier": 0,
          "assessment": "Patient currently reports 0/10 pain; baseline for post-op comparison."
        }
      ]
    },
    "functional": {
      "axisType": "B",
      "entries": [
        {
          "code": "d570",
          "domain": "Self-Care",
          "indicator": "Toileting Autonomy",
          "value": 10,
          "unit": "1-10 scale",
          "qualifier": 0,
          "assessment": "Patient is currently independent in all bowel/bladder management."
        },
        {
          "code": "d410",
          "domain": "Mobility",
          "indicator": "Supine-to-Stand Transition",
          "value": 10,
          "unit": "1-10 scale",
          "qualifier": 0,
          "assessment": "Full core-strength utilized for bed transfers without assistance."
        }
      ]
    },
    "systemic": {
      "axisType": "C",
      "entries": [
        {
          "code": "b515",
          "domain": "Digestive Functions",
          "indicator": "Bowel Motility",
          "value": 10,
          "unit": "1-10 scale",
          "qualifier": 0,
          "assessment": "Regular bowel movements; no history of chronic ileus or obstruction."
        },
        {
          "code": "b440",
          "domain": "Respiratory Functions",
          "indicator": "Inspiratory Capacity",
          "value": 2500,
          "unit": "ml",
          "qualifier": 0,
          "assessment": "Age-appropriate lung volume; critical for post-op pneumonia prevention."
        }
      ]
    }
  }
}