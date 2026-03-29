#!/usr/bin/env npx tsx
/**
 * CLI for seeding test patients in development.
 *
 * Usage:
 *   npx tsx scripts/seed-patients.ts                                  # Seed one colostomy-default patient
 *   npx tsx scripts/seed-patients.ts --preset acl-young               # Seed ACL patient
 *   npx tsx scripts/seed-patients.ts --count 5                        # Seed 5 random patients
 *   npx tsx scripts/seed-patients.ts --cleanup                        # Delete all test patients
 *   npx tsx scripts/seed-patients.ts --email "jane@test.com" --name "Jane" --preset hip-elderly
 */

import { seedPatient, seedPatients, cleanupSeedPatients, type PatientPreset, type SeedPatientOptions } from "@/lib/dev/seed-patient";
import { ensureDevAdminExists } from "@/lib/dev/init";

interface CLIArgs {
  email?: string;
  name?: string;
  password?: string;
  preset?: PatientPreset;
  count?: number;
  cleanup?: boolean;
  help?: boolean;
}

function printHelp() {
  console.log(`
╭─────────────────────────────────────────────────────────────╮
│  MGC2025 Patient Seeding CLI                                │
╰─────────────────────────────────────────────────────────────╯

USAGE:
  npx tsx scripts/seed-patients.ts [options]

OPTIONS:
  --email <email>              Patient email (optional, auto-generated if omitted)
  --name <name>                Patient name (optional, defaults to "Test Patient")
  --password <password>        Patient password (defaults to "password123")
  --preset <preset>            Patient preset: colostomy-default, acl-young, hip-elderly
                               (default: colostomy-default)
  --count <n>                  Seed N random patients with auto-generated emails
  --cleanup                    Delete all test patients (CAREFUL!)
  --help                       Show this help message

EXAMPLES:
  # Seed one patient with defaults
  npx tsx scripts/seed-patients.ts

  # Seed ACL Reconstruction patient
  npx tsx scripts/seed-patients.ts --preset acl-young --name "Alice" --email "alice@test.com"

  # Seed 10 random colostomy patients for load testing
  npx tsx scripts/seed-patients.ts --count 10 --preset colostomy-default

  # Clean up all test patients
  npx tsx scripts/seed-patients.ts --cleanup

PRESETS:
  colostomy-default            45yo male, colostomy (Low risk, standard patient)
  acl-young                    25yo female, ACL reconstruction (Low risk, athletic)
  hip-elderly                  72yo female, hip replacement (Moderate risk, elderly)
`);
}

function parseArgs(args: string[]): CLIArgs {
  const result: CLIArgs = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (arg === "--cleanup") {
      result.cleanup = true;
    } else if (arg === "--email" && i + 1 < args.length) {
      result.email = args[++i];
    } else if (arg === "--name" && i + 1 < args.length) {
      result.name = args[++i];
    } else if (arg === "--password" && i + 1 < args.length) {
      result.password = args[++i];
    } else if (arg === "--preset" && i + 1 < args.length) {
      result.preset = args[++i] as PatientPreset;
    } else if (arg === "--count" && i + 1 < args.length) {
      result.count = parseInt(args[++i], 10);
    }
  }
  
  return result;
}

function generateRandomEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `test-patient-${timestamp}-${random}@test.local`;
}

function generateRandomName(): string {
  const firstNames = ["Alex", "Jordan", "Casey", "Morgan", "Taylor", "Riley", "Avery", "Quinn"];
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis"];
  
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];
  
  return `${first} ${last}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  
  if (args.help) {
    printHelp();
    process.exit(0);
  }
  
  // Ensure dev admin exists (needed for auto-assignment)
  if (process.env.NODE_ENV === "development") {
    await ensureDevAdminExists();
  }
  
  // Handle cleanup
  if (args.cleanup) {
    console.log(`\n⚠️  WARNING: This will delete ALL test patients in the database.\n`);
    const confirm = process.env.FORCE_CLEANUP === "true" ? "yes" : "no";
    
    if (confirm !== "yes") {
      console.log("Cleanup cancelled. Set FORCE_CLEANUP=true to force deletion.\n");
      process.exit(0);
    }
    
    try {
      const count = await cleanupSeedPatients();
      console.log(`\n✓ Deleted ${count} patients successfully.\n`);
      process.exit(0);
    } catch (error: any) {
      console.error(`\n✗ Cleanup failed: ${error.message}\n`);
      process.exit(1);
    }
  }
  
  // Handle multi-seedding
  if (args.count && args.count > 0) {
    console.log(`\n🌱 Seeding ${args.count} patients with preset "${args.preset || "colostomy-default"}"...\n`);
    
    const patientsToSeed: SeedPatientOptions[] = [];
    for (let i = 0; i < args.count; i++) {
      patientsToSeed.push({
        email: generateRandomEmail(),
        name: generateRandomName(),
        preset: args.preset || "colostomy-default",
      });
    }
    
    try {
      const results = await seedPatients(patientsToSeed);
      
      console.log(`\n✓ Successfully seeded ${results.length} patients:\n`);
      results.forEach((result) => {
        console.log(`  • ${result.email}`);
      });
      console.log();
      process.exit(0);
    } catch (error: any) {
      console.error(`\n✗ Seeding failed: ${error.message}\n`);
      process.exit(1);
    }
  }
  
  // Handle single patient seeding
  const email = args.email || generateRandomEmail();
  const name = args.name || "Test Patient";
  const password = args.password || "password123";
  const preset = args.preset || "colostomy-default";
  
  console.log(`\n🌱 Seeding patient with preset "${preset}"...\n`);
  
  try {
    const result = await seedPatient({
      email,
      name,
      password,
      preset,
    });
    
    console.log(`\n✓ Patient seeded successfully!\n`);
    console.log(`Credentials:`);
    console.log(`  Email:    ${result.email}`);
    console.log(`  Password: ${result.password}`);
    console.log(`\nLogin at: http://localhost:3000/login`);
    console.log();
    process.exit(0);
  } catch (error: any) {
    console.error(`\n✗ Seeding failed: ${error.message}\n`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
