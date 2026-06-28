import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { seedPatient } from "@/lib/dev/seed-patient";
import { seedPatientMemory } from "@/lib/memory/service";

/**
 * Dev-only: ensure a fixed "harness" patient exists (fully onboarded, so it lands
 * straight on the dashboard) and return its login credentials. Idempotent — if the
 * account already exists it just returns the known creds. Used by the harness journey
 * driver to authenticate. Gated to development.
 */
const HARNESS_EMAIL = "harness@test.local";
const HARNESS_PASSWORD = "harness-password";

export async function POST() {
    if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "dev only" }, { status: 403 });
    }
    try {
        const existing = await prisma.account.findUnique({
            where: { email: HARNESS_EMAIL },
            select: { user_id: true },
        });
        if (existing) {
            // Reuse if complete; scrap a partial leftover and reseed. Single delete
            // cascades at the DB level (native FKs) — HTTP-safe, unlike deleteMany.
            const user = await prisma.user.findUnique({
                where: { id: existing.user_id },
                select: { profile: true },
            });
            if (user?.profile) {
                // Backfill PatientMemory for harness patients created before memory seeding
                // existed (idempotent — no-op if already present).
                await seedPatientMemory(existing.user_id, user.profile);
                return NextResponse.json({
                    email: HARNESS_EMAIL,
                    password: HARNESS_PASSWORD,
                    userId: existing.user_id,
                    created: false,
                });
            }
            await prisma.user.delete({ where: { id: existing.user_id } });
        }
        const result = await seedPatient({
            email: HARNESS_EMAIL,
            name: "Harness Patient",
            password: HARNESS_PASSWORD,
            preset: "colostomy-default",
            assignToDevAdmin: false,
        });
        return NextResponse.json({
            email: result.email,
            password: HARNESS_PASSWORD,
            userId: result.userId,
            created: true,
        });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
