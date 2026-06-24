import { prisma } from "@/lib/prisma";

/**
 * Seeds a test patient with prior-day feedback, then prints a curl command to
 * exercise POST /api/generate-plan. Run with: `npx tsx scripts/test-rag.ts`.
 * (This file is standalone tooling, excluded from the app typecheck in tsconfig.)
 */
async function main() {
    console.log("--- 1. Seeding Test Patient ---");
    // `treatment` and `surgeryDate` live on Biometrics, not User; User has no email.
    const user = await prisma.user.create({
        data: {
            name: "Test Patient",
            biometric: {
                create: {
                    age: 67,
                    sex: "female",
                    treatment: "Colorectal Surgery",
                    surgeryDate: new Date(
                        new Date().setDate(new Date().getDate() - 11),
                    ), // ~day 12
                },
            },
        },
    });
    console.log(`Created User: ${user.id}`);

    console.log("--- 2. Simulating Day 1 high-pain / low-intake feedback ---");
    // Modules attach to State via the generic `modules` relation, keyed by `type`.
    await prisma.state.create({
        data: {
            userId: user.id,
            dateCreated: new Date(new Date().setDate(new Date().getDate() - 1)), // Yesterday
            isActive: true,
            modules: {
                create: [
                    {
                        type: "nutrition",
                        plan: {},
                        summary: "Day 1 Plan",
                        progress: {
                            create: {
                                trackables: {
                                    protein_intake: 40,
                                    water_intake: 50,
                                }, // Low intake
                                summary: "Ate very little",
                            },
                        },
                    },
                    {
                        type: "exercise",
                        plan: {},
                        summary: "Day 1 Mobility",
                        progress: {
                            create: {
                                trackables: { steps: 50, pain_level: 8 }, // High pain
                                summary: "Could not walk due to pain",
                            },
                        },
                    },
                ],
            },
        },
    });
    console.log("Seeded Day 1 data.");

    console.log("--- 3. Test plan generation (Day 2) ---");
    console.log(`
  curl -X POST http://localhost:3000/api/generate-plan \\
   -H "Content-Type: application/json" \\
   -d '{"userId": "${user.id}", "currentDay": 2}'
  `);
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());
