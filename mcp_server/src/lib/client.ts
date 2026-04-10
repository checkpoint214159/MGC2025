/**
 * Re-exports shared infrastructure clients from the parent app.
 * The MCP server runs as a separate process but shares the same Prisma
 * and Pinecone configuration via the project-root .env.local file.
 */
export { prisma } from "@/lib/prisma";
export { getPineconeClient, getIndex, getEnvNamespace } from "@/lib/rag/client";
