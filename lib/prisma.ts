import * as dotenv from "dotenv";
import path from "path";
import { PrismaNeonHTTP } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";

// Keep env loading behavior deterministic across Next runtime and one-off scripts.
dotenv.config({
    path: path.resolve(process.cwd(), ".env.local"),
    override: false,
});

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error(
        "DATABASE_URL is not set. Ensure .env.local contains DATABASE_URL.",
    );
}

if (process.env.PRISMA_DEBUG_CONNECTION === "1") {
    try {
        const parsed = new URL(connectionString);
        const maskedHost = parsed.hostname;
        const maskedPort = parsed.port || "(default)";
        console.log(
            `[PRISMA] Using database host=${maskedHost} port=${maskedPort}`,
        );
    } catch {
        console.log(
            "[PRISMA] DATABASE_URL is set but could not be parsed as a URL",
        );
    }
}

// Neon HTTP adapter: stateless fetch-per-query, no persistent connection.
// Required on Cloudflare Workers — the WebSocket adapter (PrismaNeon) holds a
// connection that can't be reused across requests ("Cannot perform I/O on behalf
// of a different request"). HTTP has nothing to share, so this module-level
// singleton is safe across requests.
// Trade-off: NO transactions of any kind. The HTTP adapter rejects the interactive
// callback form, the batch array form ($transaction([...])), createMany, and any
// `update`-with-nested-relation-create (an UPDATE+INSERT the engine can't collapse
// into one CTE). Safe patterns: single scalar create/update, upsert, and
// create-with-nested-create (compiles to a single INSERT…RETURNING CTE chain).
// Persist multi-row/multi-table work as a sequence of single-statement writes.
const adapter = new PrismaNeonHTTP(connectionString, {});
const baseClient = new PrismaClient({ adapter });

// TEMP DIAGNOSTIC (dev only): log every Prisma operation. The last `[prisma] …` line
// before "Transactions are not supported in HTTP mode" is the exact offending call.
// If NO `[prisma]` lines appear at all, the running process is stale (not this source).
// Remove this $extends wrapper once the offending query is traced.
const prisma = (process.env.NODE_ENV === "production"
    ? baseClient
    : baseClient.$extends({
          query: {
              $allModels: {
                  async $allOperations({ model, operation, args, query }) {
                      try {
                          const res = await query(args);
                          console.log(`[prisma] ${model}.${operation} ✅`);
                          return res;
                      } catch (e: any) {
                          console.log(
                              `[prisma] ${model}.${operation} ❌ ${
                                  e?.message ?? e
                              }`,
                          );
                          throw e;
                      }
                  },
              },
          },
      })) as unknown as typeof baseClient;

export { prisma };
