"use server";

import { auth } from "@/auth";
import { prisma } from "./prisma";

/**
 * Ensures the authenticated user has the specified role.
 * Throws an error if the user is not authenticated or doesn't match the role.
 */
export async function requireRole(
    requiredRole: "patient" | "admin" | "physiotherapist" | "dietician",
): Promise<string> {
    const session = await auth();
    const userId = session?.user?.id;
    const userRole = session?.user?.role;

    if (!userId || !userRole) {
        throw new Error("Unauthorized: user not authenticated");
    }

    if (userRole !== requiredRole) {
        throw new Error(
            `Unauthorized: user role '${userRole}' does not match required role '${requiredRole}'`,
        );
    }

    return userId;
}

/**
 * Ensures the authenticated user has access to a specific patient's data.
 * Allows access if:
 * - The user IS the patient (userId === targetPatientId), OR
 * - The user is an admin who manages that patient
 *
 * Throws an error if access is denied.
 */
export async function requirePatientAccess(
    userId: string,
    targetPatientId: string,
): Promise<void> {
    // If accessing own data, allow immediately
    if (userId === targetPatientId) {
        return;
    }

    // Otherwise, check if user is an admin managing this patient
    const adminRelation = await prisma.adminPatientRelation.findUnique({
        where: {
            adminId_patientId: {
                adminId: userId,
                patientId: targetPatientId,
            },
        },
    });

    if (!adminRelation) {
        throw new Error(
            `Forbidden: user ${userId} does not have access to patient ${targetPatientId}`,
        );
    }
}

/**
 * Fetch all patient IDs that an admin manages.
 * Returns an empty array if the user is not an admin.
 */
export async function getAdminManagedPatientIds(
    adminId: string,
): Promise<string[]> {
    const relations = await prisma.adminPatientRelation.findMany({
        where: { adminId },
        select: { patientId: true },
    });

    return relations.map((rel) => rel.patientId);
}
