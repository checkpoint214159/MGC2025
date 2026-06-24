import { MemorySaver } from "@langchain/langgraph";

// ⚠️ TEMPORARY in-memory checkpointer.
//
// The onboarding graph originally used PostgresSaver
// (@langchain/langgraph-checkpoint-postgres), but that pulls in `pg` →
// `pg-cloudflare`, which breaks the Cloudflare Workers bundle (the NFT-vs-esbuild
// condition mismatch). PostgresSaver was the LAST thing using `pg`; removing it
// lets the Worker bundle cleanly.
//
// MemorySaver is per-isolate and NOT durable — onboarding interrupt/resume will
// NOT survive across Worker invocations. This is a stopgap so the app builds and
// deploys. Replace with the Durable-Object-backed CheckpointSaver before the
// onboarding graph goes live. See docs/CLOUDFLARE_MIGRATION.md (Plan B, todo #5).

let _saver: MemorySaver | null = null;

/**
 * Returns a singleton checkpointer for the onboarding graph.
 * TEMPORARY: in-memory only (see file header).
 */
export async function getOnboardingCheckpointer(): Promise<MemorySaver> {
    if (_saver) return _saver;
    _saver = new MemorySaver();
    return _saver;
}
