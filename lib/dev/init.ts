"use server";

import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

const DEV_ADMIN_EMAIL = "dev-admin@localhost";
const DEV_ADMIN_PASSWORD = "dev-admin-password";

/**
 * Ensures dev admin account exists in development mode.
 * Called once on server startup if NODE_ENV === 'development'.
 * Will create the account if it doesn't exist, otherwise does nothing.
 */
export async function ensureDevAdminExists() {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  try {
    // Check if dev admin already exists
    const existingAdmin = await prisma.account.findFirst({
      where: { email: DEV_ADMIN_EMAIL },
    });

    if (existingAdmin) {
      console.log(
        "[DEV] Dev admin account already exists:",
        DEV_ADMIN_EMAIL
      );
      return;
    }

    // Create dev admin account
    const hashedPassword = await hash(DEV_ADMIN_PASSWORD, 10);

    const devAdmin = await prisma.user.create({
      data: {
        name: "Development Admin",
        role: "admin",
        account: {
          create: {
            email: DEV_ADMIN_EMAIL,
            password: hashedPassword,
          },
        },
      },
      include: { account: true },
    });

    console.warn(
      `[DEV] ⚠️  Created development admin account:\n` +
      `    Email: ${DEV_ADMIN_EMAIL}\n` +
      `    Password: ${DEV_ADMIN_PASSWORD}\n` +
      `    ID: ${devAdmin.id}\n` +
      `[DEV] This account is automatically created and can manage all demo patients.`
    );
  } catch (error) {
    console.error(
      "[DEV] Failed to ensure dev admin exists:",
      error
    );
  }
}

/**
 * Gets the dev admin account ID. Returns null if not in development mode.
 */
export async function getDevAdminId(): Promise<string | null> {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  try {
    const account = await prisma.account.findFirst({
      where: { email: DEV_ADMIN_EMAIL },
      include: { user: true },
    });

    return account?.user.id ?? null;
  } catch (error) {
    console.error("[DEV] Failed to get dev admin ID:", error);
    return null;
  }
}
