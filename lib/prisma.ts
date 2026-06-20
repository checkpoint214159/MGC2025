import * as dotenv from "dotenv";
import path from "path";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
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

// Neon's wire protocol runs over WebSockets. Cloudflare Workers (workerd)
// provide a global WebSocket automatically; Node does not, so we attach the
// `ws` polyfill there. The guard keeps `ws` out of the Workers runtime path.
const onWorkerd =
	typeof navigator !== "undefined" &&
	navigator.userAgent === "Cloudflare-Workers";
if (!onWorkerd) {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	neonConfig.webSocketConstructor = require("ws");
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

export { prisma };
