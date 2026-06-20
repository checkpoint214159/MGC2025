// Spike Phase 2: run a LangGraph graph INSIDE a Durable Object, with the
// interrupt and the resume arriving as two SEPARATE HTTP requests — proving
// durable, resumable graph state on Cloudflare without Postgres.
//
// Must run before any langchain import: initialize langchain's ALS singleton
// with workerd's real AsyncLocalStorage so interrupt() context propagates.
import { AsyncLocalStorage } from "node:async_hooks";
import { AsyncLocalStorageProviderSingleton } from "@langchain/core/singletons";
AsyncLocalStorageProviderSingleton.initializeGlobalInstance(
  new AsyncLocalStorage(),
);

import { DurableObject } from "cloudflare:workers";
import {
  StateGraph,
  Annotation,
  MemorySaver,
  interrupt,
  Command,
} from "@langchain/langgraph";

interface Env {
  ONBOARDING: DurableObjectNamespace<OnboardingDO>;
}

const SpikeState = Annotation.Root({
  count: Annotation<number>({ reducer: (_, b) => b, default: () => 0 }),
  log: Annotation<string[]>({ reducer: (a, b) => a.concat(b), default: () => [] }),
});

function buildGraph() {
  return new StateGraph(SpikeState)
    .addNode("ask", async (s) => {
      const answer = interrupt({ type: "question", q: "What is your name?" });
      return { count: s.count + 1, log: [`answer:${answer}`] };
    })
    .addEdge("__start__", "ask")
    .addEdge("ask", "__end__")
    .compile({ checkpointer: new MemorySaver() });
}

export class OnboardingDO extends DurableObject<Env> {
  // One compiled graph + checkpointer per DO instance. The DO is the durable,
  // single-threaded, addressable home for this user's onboarding run; its state
  // survives between requests. (Phase 3 will persist the checkpointer to
  // ctx.storage so it also survives DO eviction/restart.)
  private graph = buildGraph();
  private cfg = { configurable: { thread_id: "onboarding" } };

  async start() {
    const r: any = await this.graph.invoke({ count: 0 }, this.cfg);
    return r.__interrupt__ ?? r;
  }

  async resume(answer: string) {
    return await this.graph.invoke(new Command({ resume: answer }), this.cfg);
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    // One DO instance per user (here: a fixed demo user).
    const stub = env.ONBOARDING.get(env.ONBOARDING.idFromName("user-1"));

    if (url.pathname === "/start") {
      return Response.json({ ok: true, interrupted: await stub.start() });
    }
    if (url.pathname === "/resume") {
      const answer = url.searchParams.get("a") ?? "Ben";
      return Response.json({ ok: true, final: await stub.resume(answer) });
    }
    return new Response("POST /start then /resume?a=YourName", { status: 404 });
  },
};
