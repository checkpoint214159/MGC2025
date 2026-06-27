/**
 * createLogger — lightweight namespaced console wrapper.
 *
 * Usage:
 *   const log = createLogger("cron");
 *   log.info("fired");        // [cron] fired
 *   log.warn("missed");       // [cron] missed
 *   log.error("failed", err); // [cron] failed <Error>
 *
 * Namespace conventions in this codebase:
 *   "prisma"   — DB operations (prisma.ts)
 *   "graph"    — LangGraph node lifecycle (graphLogging.ts)
 *   "llm"      — model calls and prompt context
 *   "cron"     — scheduled notification runs
 *   "push"     — web push delivery
 *   "email"    — transactional email delivery
 *   "rag"      — retrieval-augmented generation
 *   "dev"      — dev-only seeding / admin helpers
 */
export interface Logger {
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
}

export function createLogger(namespace: string): Logger {
    const prefix = `[${namespace}]`;
    return {
        info: (...args) => console.log(prefix, ...args),
        warn: (...args) => console.warn(prefix, ...args),
        error: (...args) => console.error(prefix, ...args),
    };
}
