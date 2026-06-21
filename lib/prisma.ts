import * as dotenv from "dotenv";
import path from "path";
import { PrismaNeonHTTP } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";

// Keep env loading behavior deterministic across Next runtime and one-off scripts.
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: false });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
	throw new Error("DATABASE_URL is not set. Ensure .env.local contains DATABASE_URL.");
}

if (process.env.PRISMA_DEBUG_CONNECTION === "1") {
	try {
		const parsed = new URL(connectionString);
		const maskedHost = parsed.hostname;
		const maskedPort = parsed.port || "(default)";
		console.log(`[PRISMA] Using database host=${maskedHost} port=${maskedPort}`);
	} catch {
		console.log("[PRISMA] DATABASE_URL is set but could not be parsed as a URL");
	}
}

// Neon HTTP adapter: stateless fetch-per-query, no persistent connection.
// Required on Cloudflare Workers — the WebSocket adapter (PrismaNeon) holds a
// connection that can't be reused across requests ("Cannot perform I/O on behalf
// of a different request"). HTTP has nothing to share, so this module-level
// singleton is safe across requests.
// Trade-off: no INTERACTIVE transactions (callback form) — use batch $transaction([...]).
const adapter = new PrismaNeonHTTP(connectionString, {});
const prisma = new PrismaClient({ adapter });

export { prisma };
