import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

let _saver: PostgresSaver | null = null;

/**
 * Returns a singleton PostgresSaver for the onboarding graph.
 *
 * On first call, runs saver.setup() which creates the LangGraph checkpoint tables
 * (checkpoint, checkpoint_writes, checkpoint_blobs) in your existing Postgres DB.
 * These are idempotent — safe to call multiple times.
 *
 * The saver uses DATABASE_URL from .env.local (same as Prisma), so no extra
 * Postgres connection is needed.
 */
export async function getOnboardingCheckpointer(): Promise<PostgresSaver> {
  if (_saver) return _saver;

  _saver = PostgresSaver.fromConnString(process.env.DATABASE_URL!);
  await _saver.setup();

  return _saver;
}
