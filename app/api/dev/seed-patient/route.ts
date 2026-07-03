import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { seedPatient, type PatientPreset } from "@/lib/dev/seed-patient";
import { seedPatientMemory } from "@/lib/memory/service";

/**
 * Dev-only: ensure a fixed "harness" patient exists (fully onboarded, so it lands
 * straight on the dashboard) and return its login credentials. Idempotent — if the
 * account already exists it just returns the known creds. Gated to development.
 *
 * Body (optional): { preset?: "colostomy-default" | "acl-young" | "hip-elderly" }
 * Each preset is a distinct persona (sex × surgery type) with its own harness account,
 * so test loops can run the same policy across different patient profiles:
 *   colostomy-default → harness@test.local            (M, 45, colostomy)
 *   acl-young         → harness-acl-young@test.local  (F, 25, ACL reconstruction)
 *   hip-elderly       → harness-hip-elderly@test.local (F, 72, hip replacement)
 */
const HARNESS_PASSWORD = "harness-password";
const VALID_PRESETS: PatientPreset[] = [
    "colostomy-default",
    "acl-young",
    "hip-elderly",
];

function emailFor(preset: PatientPreset): string {
    // Back-compat: the original harness patient keeps the unsuffixed address.
    return preset === "colostomy-default"
        ? "harness@test.local"
        : `harness-${preset}@test.local`;
}

export async function POST(req: Request) {
    if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "dev only" }, { status: 403 });
    }
    try {
        const body = await req.json().catch(() => ({}));
        const preset: PatientPreset = VALID_PRESETS.includes(body?.preset)
            ? body.preset
            : "colostomy-default";
        const email = emailFor(preset);

        const existing = await prisma.account.findUnique({
            where: { email },
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
                    email,
                    password: HARNESS_PASSWORD,
                    userId: existing.user_id,
                    preset,
                    created: false,
                });
            }
            await prisma.user.delete({ where: { id: existing.user_id } });
        }
        const result = await seedPatient({
            email,
            name: `Harness ${preset}`,
            password: HARNESS_PASSWORD,
            preset,
            assignToDevAdmin: false,
        });
        return NextResponse.json({
            email: result.email,
            password: HARNESS_PASSWORD,
            userId: result.userId,
            preset,
            created: true,
        });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
