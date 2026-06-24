import { isGraphBubbleUp } from "@langchain/langgraph";

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
        console.log(`[graph] ▶ ${name}`);
        try {
            const result = await fn(input);
            console.log(`[graph] ✓ ${name} (${Date.now() - startedAt}ms)`);
            return result;
        } catch (err) {
            if (isGraphBubbleUp(err)) {
                console.log(
                    `[graph] ⏸ ${name} — paused (awaiting input / redirect)`,
                );
            } else {
                console.error(
                    `[graph] ✗ ${name} FAILED (${Date.now() - startedAt}ms): ${
                        (err as any)?.message ?? err
                    }`,
                );
            }
            throw err;
        }
    };
}
