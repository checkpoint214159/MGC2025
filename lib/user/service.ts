import { prisma } from "@/lib/prisma";
import { Biometrics } from "./schema";
import { Thread, ThreadSchema } from "@/lib/external/schemas/thread";
import { BaseMessage } from "@/lib/external/schemas/message";
import { ScreeningResult } from "@/lib/onboarding/screening";

export interface ProfileInput {
  thread: Thread;
  biometrics: Biometrics;
  screening: ScreeningResult;
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



export async function setScreening(userId: string, screening: ScreeningResult) {
  return await prisma.screening.upsert({
    where: { userId: userId },
    update: { data: screening as any },
    create: {
      userId: userId,
      data: screening as any,
    },
  });
}

export async function getScreening(userId: string) {
  return await prisma.user.findUnique({
    where: { id: userId },
    select: {
      screening: true
    }
  })
}

export async function deleteScreening(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { screening: true }
  });

  if (user?.screening) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        screening: { delete: true },
      }
    });
  }
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
      screening: true
    }
  });

  return {
    biometrics: user?.biometric || null,
    activeThread: user?.threads[0] || null,
    screening: user?.screening || null,
  };
}

export async function deleteOnboardingData(userId: string) {
  await Promise.all([
    deleteScreening(userId),
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
