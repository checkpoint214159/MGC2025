import { defineConfig } from "@prisma/config";
import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
        seed: "tsx prisma/seed.ts",
    },
    // datasource url now lives in schema.prisma (url = env("DATABASE_URL")) —
    // required by Prisma 6.x, which we pin for Cloudflare Workers WASM compat.
});
