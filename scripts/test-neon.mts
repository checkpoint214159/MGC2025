// Connectivity smoke test: Neon serverless driver against the real DB over HTTP.
// Confirms DATABASE_URL + network + DB are reachable from a fetch-based driver
// (the same transport Prisma's Neon adapter uses on Workers).
// Run: npx tsx scripts/test-neon.mts
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);
const rows = await sql`
  SELECT 1 AS x, current_database() AS db, version() AS ver
`;
console.log("Neon HTTP driver → DB OK:", rows[0]);
