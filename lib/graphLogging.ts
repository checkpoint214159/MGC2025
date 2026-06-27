import { isGraphBubbleUp } from "@langchain/langgraph";
import { createLogger } from "@/lib/logger";

const log = createLogger("graph");

/**
 * Wraps a LangGraph node so every entry, success, and failure is logged with the node
 * name — so when a graph run fails you can see exactly which node threw and why, instead
 * of a bare stack trace. Apply at the `.addNode(name, loggedNode(name, fn))` site.
 *
 * `interrupt()` and `Command` throw control-flow signals (not errors) to pause/redirect
 * the graph; those are logged as a pause (⏸), not a failure, and re-thrown unchanged.
 */
export function loggedNode<Input, Output>(
    name: string,
    fn: (input: Input) => Promise<Output>,
): (input: Input) => Promise<Output> {
    return async (input: Input) => {
        const startedAt = Date.now();
        log.info(`▶ ${name}`);
        try {
            const result = await fn(input);
            log.info(`✓ ${name} (${Date.now() - startedAt}ms)`);
            return result;
        } catch (err) {
            if (isGraphBubbleUp(err)) {
                log.info(`⏸ ${name} — paused (awaiting input / redirect)`);
            } else {
                log.error(
                    `✗ ${name} FAILED (${Date.now() - startedAt}ms): ${
                        (err as Error)?.message ?? err
                    }`,
                );
            }
            throw err;
        }
    };
}
