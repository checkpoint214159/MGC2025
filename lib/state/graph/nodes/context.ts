import { prisma } from "@/lib/prisma";
import { getActiveState } from "@/lib/state/service";
import { getStateGenerationConfig } from "@/lib/state/graph/config";
import { StateGenerationState } from "@/lib/state/graph/state";

/**
 * Node: load_context
 *
 * Maps to the initial data-loading portion of generateNewState() in lib/state/service.ts:
 * - Fetch the user and their threads
 * - Load historical states according to config (1 day, N days, or all)
 * - Build a concatenated transcript string from all threads
 *
 * Returns:
 *   { previousState, stateHistory, transcripts, contextMetadata }
 *
 * 💡 LangGraph: This node is called once at the start of the graph.
 * It reads from the Prisma DB and returns partial state updates.
 * The returned object is merged into the graph state via reducers.
 *
 * 💡 Configuration: Behavior is controlled by StateGenerationConfig:
 * - contextWindowDays: 1 (yesterday), N (last N days), -1 (all history)
 * - smartFiltering: if true, only include states with significant changes
 */
export async function loadContextNode(
  state: StateGenerationState
): Promise<Partial<StateGenerationState>> {
  // 📋 Load runtime configuration
  console.log("[loadContextNode] ⏱️ Starting node for userId:", state.userId, "date:", state.date);
  const config = await getStateGenerationConfig();
  console.log("[loadContextNode] ✅ Config loaded:", config);

  const yesterday = new Date(state.date);
  yesterday.setDate(yesterday.getDate() - 1);

  // 📖 Determine lookback window
  let historicalStates: any[] = [];

  if (config.contextWindowDays === -1) {
    // Load ALL history (unlimited lookback)
    historicalStates = await loadAllStateHistory(state.userId);
  } else if (config.contextWindowDays === 1) {
    // Load only yesterday (default, fastest)
    const yesterday_state = await getActiveState(state.userId, yesterday);
    if (yesterday_state) historicalStates = [yesterday_state];
  } else {
    // Load last N days
    for (let i = 0; i < config.contextWindowDays; i++) {
      const d = new Date(yesterday);
      d.setDate(d.getDate() - i);
      const s = await getActiveState(state.userId, d);
      if (s) historicalStates.push(s);
    }
  }

  // Apply smart filtering if enabled
  if (config.smartFiltering && historicalStates.length > 0) {
    historicalStates = filterSignificantStates(historicalStates);
  }

  // 📖 Fetch user and threads
  const user = await prisma.user.findUnique({
    where: { id: state.userId },
    include: { threads: { include: { messages: true } } },
  });

  if (!user) throw new Error(`User ${state.userId} not found`);

  // 🧮 Build the transcript string from all threads
  const threadContext = user.threads;
  const transcripts = threadContext
    .map((thread: any) => {
      const msgs = thread.messages
        ?.map((m: any) => `[${m.role.toUpperCase()}]: ${m.content}`)
        .join("\n") || "No messages";
      return `### Thread: ${thread.title || "General"}\n${msgs}`;
    })
    .join("\n\n---\n\n");

  // 📝 Metadata about context selection (audit trail)
  const contextMetadata = {
    configApplied: {
      contextWindowDays: config.contextWindowDays,
      smartFiltering: config.smartFiltering,
    },
    statesLoaded: historicalStates.length,
    transcriptSize: transcripts.length,
  };

  return {
    previousState: historicalStates[0] ?? null, // Most recent historical state
    stateHistory: historicalStates,
    transcripts,
    contextMetadata,
  };
}

/**
 * Load all available state history for a user (limited to last 90 days for safety).
 */
async function loadAllStateHistory(userId: string): Promise<any[]> {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const states = await prisma.state.findMany({
    where: {
      userId,
      dateCreated: { gte: ninetyDaysAgo },
    },
    orderBy: { dateCreated: "desc" },
    include: { modules: true },
  });

  return states;
}

/**
 * Filter states to only those with significant changes.
 * This prevents context overload by skipping stable periods.
 *
 * Strategy:
 * - Always include the most recent state
 * - Always include the oldest state (baseline)
 * - Include states where module summaries or plans changed significantly
 */
function filterSignificantStates(states: any[]): any[] {
  if (states.length <= 2) return states;

  const filtered = [states[0]]; // Always include most recent

  for (let i = 1; i < states.length - 1; i++) {
    const current = states[i];
    const previous = states[i - 1];

    // Compute a simple "change score" between states
    const changeScore = computeStateChangeScore(previous, current);

    if (changeScore > 0.2) {
      // 20% threshold for significant change
      filtered.push(current);
    }
  }

  if (states.length > 1 && !filtered.includes(states[states.length - 1])) {
    filtered.push(states[states.length - 1]); // Always include oldest
  }

  return filtered.reverse(); // Chronological order
}

/**
 * Compute how much a state changed relative to the previous one (0-1 scale).
 * Measures: module summaries, plan changes, etc.
 */
function computeStateChangeScore(
  prevState: any,
  currState: any
): number {
  if (!prevState || !currState) return 1.0; // Treat missing as maximum change

  let score = 0;
  let comparisons = 0;

  // Compare each module
  const prevModules = new Map(
    (prevState.modules as any[])?.map((m: any) => [m.type, m]) ?? []
  );
  const currModules = new Map(
    (currState.modules as any[])?.map((m: any) => [m.type, m]) ?? []
  );

  for (const [type, currMod] of currModules) {
    const prevMod = prevModules.get(type);
    if (!prevMod) {
      score += 1.0; // New module = big change
    } else {
      // Compare summaries (simple text diff heuristic)
      const summaryDiff =
        (prevMod as any).summary !== (currMod as any).summary ? 0.5 : 0.0;
      const planDiff =
        JSON.stringify((prevMod as any).plan) !== JSON.stringify((currMod as any).plan)
          ? 0.3
          : 0.0;
      score += summaryDiff + planDiff;
    }
    comparisons++;
  }

  return comparisons > 0 ? score / comparisons : 0;
}
