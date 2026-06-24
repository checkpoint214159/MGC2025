# Prompt Caching — MGC2025

How to cut LLM cost and time-to-first-token (TTFT) by caching repeated prompt prefixes. Relevant because our onboarding/state graphs send the **same large system prompt** many times per session, and the chat route reuses a big RAG/guidelines block.

## How it works

When you send a prompt, the model must **prefill** (process every input token) before emitting the first output token. Caching stores that processed prefix so repeated requests skip re-prefilling the shared part:

-   **Latency:** lower TTFT — the cached prefix isn't recomputed. Bigger + more-repeated prefix = bigger win.
-   **Cost:** cached input tokens bill at **~0.1×** instead of full price.

### Pricing / TTL (Anthropic — our `anthropic/claude-sonnet-4` calls)

|                              | Multiplier  |
| ---------------------------- | ----------- |
| Cache **write** (5-min TTL)  | 1.25× input |
| Cache **write** (1-hour TTL) | 2× input    |
| Cache **read**               | ~0.1× input |

-   **Break-even:** 2 requests for the 5-min TTL, 3 for the 1-hour. Below that it costs _more_ — don't cache one-off prompts.
-   TTL default 5 min, refreshed on each hit; 1h optional.
-   Minimum cacheable prefix ≈ **1024 tokens** for Claude Sonnet 4 (model-dependent; shorter prefixes silently don't cache).
-   Max **4** `cache_control` breakpoints per request.

## The one invariant — and how our current code breaks it

**Caching is a prefix match.** The cache key is the exact bytes from the start up to a `cache_control` breakpoint. _Any_ byte change before the breakpoint invalidates everything after it. Render order is **tools → system → messages**.

⚠️ **Current bug:** [app/api/chat/route.ts](../app/api/chat/route.ts) interpolates **volatile** values — mood, recent activity, _and the user's question_ — directly into the system string. The prefix changes every request, so **nothing caches**. Same risk anywhere a per-user value sits ahead of fixed instructions.

**Fix = stable-first, volatile-last:**

1. Fixed identity + instructions + hospital guidelines → `cache_control` breakpoint at the **end** of this block.
2. Volatile per-request data (mood, activity, the question) → _after_ the breakpoint, uncached.

## Through OpenRouter — provider split

OpenRouter passes caching through, but the mechanism differs by model:

| Model                                          | Caching       | What we do                                                                         |
| ---------------------------------------------- | ------------- | ---------------------------------------------------------------------------------- |
| `anthropic/claude-sonnet-4` (onboarding/state) | **Explicit**  | Add `cache_control: {type:"ephemeral"}` breakpoints ourselves                      |
| `deepseek/deepseek-chat` (chat route)          | **Automatic** | DeepSeek caches repeated prefixes itself — no markers, just keep the prefix stable |

So the **chat route gets automatic caching from DeepSeek for free** once we stop poisoning the prefix. The **Claude onboarding loop** is where explicit breakpoints pay off most (same big system prompt across all 5 questions).

## Wiring via the Vercel AI SDK + OpenRouter provider

AI SDK v5 attaches cache control through `providerOptions` on the message/part that ends the cached prefix. Conceptually:

```ts
messages: [
    {
        role: "system",
        content: FIXED_SYSTEM_AND_GUIDELINES,
        providerOptions: {
            openrouter: { cacheControl: { type: "ephemeral" } },
        },
    },
    { role: "user", content: volatileQuestion }, // after breakpoint — uncached
];
```

> ⚠️ **Verify the exact `providerOptions` key** for `@openrouter/ai-sdk-provider@1.x` before committing — the cache-control passthrough field name has varied between provider versions, and a wrong key _silently doesn't cache_ rather than erroring.

**Verify it works:** check response usage for cached tokens (OpenRouter surfaces cache/discount tokens in usage accounting). If cached reads stay 0 across repeated calls, a volatile value is still in the prefix — the #1 silent failure.

## Recommended for this app

1. **Restructure prompts** stable-first/volatile-last (needed regardless of provider; alone this enables DeepSeek auto-caching on chat).
2. **Add explicit `cache_control`** to the fixed system prompt in the onboarding/state **Claude** calls — highest-value spot (big prompt, 5+× per session).
3. Only bother when the cached prefix clears ~1024 tokens and repeats ≥2× within the TTL.

_Source: Anthropic prompt-caching reference (via the claude-api skill), 2026-06._
