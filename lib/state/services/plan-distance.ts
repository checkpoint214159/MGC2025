import {
    expectedEnvelope,
    bandDeviation,
    clampToEnvelope,
    DEFAULT_ENVELOPE,
    type EnvelopeParams,
} from "./plan-envelope";

/**
 * PLAN-SPACE DISTANCE (docs/PLAN_DISTANCE.md; TODO 12 / task c).
 *
 * Measures how far a generated plan drifts from the clinician ANCHOR, decomposed into three
 * orthogonal axes so legitimate recovery progression costs nothing while intent drift and
 * unexpected numeric extremes accumulate distance:
 *
 *   C composition — which prescribed tasks exist (1 − Jaccard over matched identities).
 *   S semantic    — is the plan still the same KIND of program: Jensen–Shannon divergence of
 *                   the category mix + the blue/orange/red intensity mix (cheap v1, no
 *                   embeddings — name matching is token-overlap based).
 *   N numeric     — per matched task, deviation OUTSIDE the graduated-progression envelope,
 *                   hinged (small excursions free) and aggregated by p95 so one clinically
 *                   implausible number dominates rather than averaging away.
 *
 * D = w_c·C + w_s·S + w_n·N ∈ [0, ~1+]. Pure and dependency-free.
 */

// ── Task extraction (mirrors scripts/harness/_plan.mjs) ─────────────────────

export interface PlanTask {
    module: string; // module type: exercise | nutrition | sleep
    name: string;
    category: string; // metric key: mobility | aerobic | calories | duration | …
    goal: number;
    unit: string;
    intensity?: "blue" | "orange" | "red";
    /** Location for the clamp: plan-item id + metric key. */
    itemId: string;
    metricKey: string;
}

type ModuleLike = {
    type: string;
    plan?: unknown;
};

/** Walk modules → plan items → goal-bearing metrics (goal > 0). Symptoms drop out (goal 0). */
export function extractPlanTasks(modules: ModuleLike[]): PlanTask[] {
    const tasks: PlanTask[] = [];
    for (const mod of modules ?? []) {
        const plan = Array.isArray(mod.plan) ? mod.plan : [];
        for (const item of plan as Array<{
            id?: string;
            meta?: { name?: string; intensity?: string };
            data?: Record<string, { goal?: number; unit?: string }>;
        }>) {
            for (const [key, metric] of Object.entries(item.data ?? {})) {
                if (!metric || typeof metric !== "object") continue;
                const goal = Number(metric.goal ?? 0);
                if (!(goal > 0)) continue;
                tasks.push({
                    module: mod.type,
                    name: item.meta?.name ?? key,
                    category: key,
                    goal,
                    unit: metric.unit ?? "",
                    intensity: item.meta?.intensity as PlanTask["intensity"],
                    itemId: item.id ?? "",
                    metricKey: key,
                });
            }
        }
    }
    return tasks;
}

// ── Matching (identity without embeddings) ───────────────────────────────────

const normalize = (s: string) =>
    s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2);

/** Token-overlap (Dice) similarity between task names — the cheap stand-in for embeddings. */
function nameSimilarity(a: PlanTask, b: PlanTask): number {
    if (a.module !== b.module) return 0;
    const ta = new Set(normalize(a.name));
    const tb = new Set(normalize(b.name));
    if (ta.size === 0 || tb.size === 0)
        return a.category === b.category ? 0.6 : 0;
    let common = 0;
    for (const w of ta) if (tb.has(w)) common++;
    const dice = (2 * common) / (ta.size + tb.size);
    // Same metric category is corroborating signal for renamed-but-equivalent tasks.
    return a.category === b.category ? Math.max(dice, 0.5 + dice / 2) : dice;
}

export interface TaskMatch {
    anchor: PlanTask;
    plan: PlanTask | null; // null = the prescribed task was dropped
    similarity: number;
}

const MATCH_THRESHOLD = 0.5;

/** Greedy best-match of anchor tasks onto plan tasks (each plan task used once). */
export function matchTasks(
    anchorTasks: PlanTask[],
    planTasks: PlanTask[],
): { matches: TaskMatch[]; added: PlanTask[] } {
    const used = new Set<number>();
    const matches: TaskMatch[] = [];

    for (const a of anchorTasks) {
        let best = -1;
        let bestSim = 0;
        planTasks.forEach((p, i) => {
            if (used.has(i)) return;
            const sim = nameSimilarity(a, p);
            if (sim > bestSim) {
                bestSim = sim;
                best = i;
            }
        });
        if (best >= 0 && bestSim >= MATCH_THRESHOLD) {
            used.add(best);
            matches.push({
                anchor: a,
                plan: planTasks[best],
                similarity: bestSim,
            });
        } else {
            matches.push({ anchor: a, plan: null, similarity: 0 });
        }
    }
    const added = planTasks.filter((_, i) => !used.has(i));
    return { matches, added };
}

// ── Distribution divergence (semantic axis) ──────────────────────────────────

function distribution(keys: (string | undefined)[]): Map<string, number> {
    const counts = new Map<string, number>();
    let n = 0;
    for (const k of keys) {
        if (!k) continue;
        counts.set(k, (counts.get(k) ?? 0) + 1);
        n++;
    }
    for (const [k, v] of counts) counts.set(k, v / Math.max(n, 1));
    return counts;
}

/** Jensen–Shannon divergence (base 2, ∈ [0,1]) between two categorical distributions. */
export function jsDivergence(
    p: Map<string, number>,
    q: Map<string, number>,
): number {
    if (p.size === 0 && q.size === 0) return 0;
    if (p.size === 0 || q.size === 0) return 1;
    const keys = new Set([...p.keys(), ...q.keys()]);
    const kl = (a: Map<string, number>, m: Map<string, number>) => {
        let s = 0;
        for (const k of keys) {
            const ak = a.get(k) ?? 0;
            const mk = m.get(k) ?? 0;
            if (ak > 0 && mk > 0) s += ak * Math.log2(ak / mk);
        }
        return s;
    };
    const m = new Map<string, number>();
    for (const k of keys) m.set(k, ((p.get(k) ?? 0) + (q.get(k) ?? 0)) / 2);
    return kl(p, m) / 2 + kl(q, m) / 2;
}

// ── The metric ────────────────────────────────────────────────────────────────

export interface DistanceParams {
    weights: { composition: number; semantic: number; numeric: number };
    /** Hinge: band deviations ≤ tau are free; beyond it cost grows superlinearly. */
    tau: number;
    envelope: EnvelopeParams;
}

export const DEFAULT_DISTANCE: DistanceParams = {
    weights: { composition: 0.3, semantic: 0.3, numeric: 0.4 },
    tau: Number(process.env.PLAN_DISTANCE_TAU ?? 0.15),
    envelope: DEFAULT_ENVELOPE,
};

export interface PerTaskDistance {
    name: string;
    module: string;
    matched: boolean;
    goal?: number;
    expected?: number;
    deviation: number; // signed band excursion (0 = inside envelope)
    cost: number; // hinged cost
}

export interface PlanDistanceResult {
    D: number;
    composition: number;
    semantic: number;
    numeric: number;
    matchedTasks: number;
    droppedTasks: number;
    addedTasks: number;
    perTask: PerTaskDistance[];
}

export interface DistanceContext {
    /** Recovery day the candidate plan is generated for. */
    recoveryDay: number;
    /** Recovery day the anchor was set on (usually 0/1). */
    anchorDay: number;
    /** Total arc length from the anchor (State.recoveryDays). */
    arcDays: number;
}

function hinge(dev: number, tau: number): number {
    const a = Math.abs(dev);
    if (a <= tau) return 0;
    return Math.min(((a - tau) / tau) ** 2, 4); // cap so D stays interpretable
}

/** p95-ish: one extreme task dominates; many mild ones don't average it away. */
function p95(costs: number[]): number {
    if (costs.length === 0) return 0;
    const sorted = [...costs].sort((x, y) => x - y);
    const idx = Math.min(
        sorted.length - 1,
        Math.floor(0.95 * (sorted.length - 1) + 0.999),
    );
    return sorted[idx];
}

export function planDistance(
    anchorTasks: PlanTask[],
    planTasks: PlanTask[],
    ctx: DistanceContext,
    params: DistanceParams = DEFAULT_DISTANCE,
): PlanDistanceResult {
    const { matches, added } = matchTasks(anchorTasks, planTasks);
    const matched = matches.filter((m) => m.plan !== null);

    // C — composition: 1 − Jaccard(matched | anchor ∪ plan-additions). Additions that are
    // SIBLING METRICS on an already-matched plan item (e.g. fiber/sugar added to the matched
    // macro item) are metric enrichment, not a new prescription — half weight, so genuinely
    // novel items (new exercises, new modalities) dominate the axis. (12.2 observation: the
    // full-weight version put a constant ~0.18 noise floor under every generation.)
    const matchedItemIds = new Set(
        matched.map((m) => m.plan!.itemId).filter(Boolean),
    );
    const weightedAdded = added.reduce(
        (s, t) => s + (matchedItemIds.has(t.itemId) ? 0.5 : 1),
        0,
    );
    const union = anchorTasks.length + weightedAdded;
    const composition = union === 0 ? 0 : 1 - matched.length / union;

    // S — semantic: category-mix + intensity-mix divergence (cheap intent signal)
    const catJS = jsDivergence(
        distribution(anchorTasks.map((t) => `${t.module}:${t.category}`)),
        distribution(planTasks.map((t) => `${t.module}:${t.category}`)),
    );
    const intJS = jsDivergence(
        distribution(
            anchorTasks
                .filter((t) => t.module === "exercise")
                .map((t) => t.intensity),
        ),
        distribution(
            planTasks
                .filter((t) => t.module === "exercise")
                .map((t) => t.intensity),
        ),
    );
    const semantic = (catJS + intJS) / 2;

    // N — numeric: hinged band deviation per matched task, p95-aggregated
    const perTask: PerTaskDistance[] = matches.map((m) => {
        if (!m.plan) {
            return {
                name: m.anchor.name,
                module: m.anchor.module,
                matched: false,
                deviation: 0,
                cost: 0, // dropped tasks are charged via C, not N
            };
        }
        const env = expectedEnvelope(
            m.anchor.goal,
            ctx.recoveryDay,
            ctx.anchorDay,
            ctx.arcDays,
            params.envelope,
        );
        const deviation = bandDeviation(m.plan.goal, env);
        return {
            name: m.anchor.name,
            module: m.anchor.module,
            matched: true,
            goal: m.plan.goal,
            expected: Number(env.expected.toFixed(2)),
            deviation: Number(deviation.toFixed(3)),
            cost: Number(hinge(deviation, params.tau).toFixed(3)),
        };
    });
    const numeric = p95(perTask.filter((t) => t.matched).map((t) => t.cost));

    const { weights } = params;
    const D =
        weights.composition * composition +
        weights.semantic * semantic +
        weights.numeric * Math.min(numeric, 1);

    return {
        D: Number(D.toFixed(3)),
        composition: Number(composition.toFixed(3)),
        semantic: Number(semantic.toFixed(3)),
        numeric: Number(numeric.toFixed(3)),
        matchedTasks: matched.length,
        droppedTasks: matches.length - matched.length,
        addedTasks: added.length,
        perTask,
    };
}

// ── Deterministic clamp (the numeric "reject") ───────────────────────────────

export interface ClampRecord {
    module: string;
    name: string;
    from: number;
    to: number;
}

/**
 * Project out-of-band goals in generated module blueprints back to the envelope edge —
 * the working-doc "reject": no clinically-extreme number ever reaches the patient even if
 * the LLM ignored the in-prompt anchor. MUTATES the blueprints in place; returns the edits.
 */
export function clampBlueprintsToEnvelope(
    blueprints: Record<string, { plan?: unknown }>,
    anchorTasks: PlanTask[],
    ctx: DistanceContext,
    params: DistanceParams = DEFAULT_DISTANCE,
): ClampRecord[] {
    const modulesLike = Object.entries(blueprints).map(([type, b]) => ({
        type,
        plan: b.plan,
    }));
    const planTasks = extractPlanTasks(modulesLike);
    const { matches } = matchTasks(anchorTasks, planTasks);
    const clamps: ClampRecord[] = [];

    for (const m of matches) {
        if (!m.plan) continue;
        const env = expectedEnvelope(
            m.anchor.goal,
            ctx.recoveryDay,
            ctx.anchorDay,
            ctx.arcDays,
            params.envelope,
        );
        // Free inside the hinge margin — only genuinely extreme numbers get projected.
        const dev = bandDeviation(m.plan.goal, env);
        if (Math.abs(dev) <= params.tau) continue;

        const clamped = Number(clampToEnvelope(m.plan.goal, env).toFixed(2));
        // Locate the metric in the blueprint and overwrite the goal.
        const blueprint = blueprints[m.plan.module];
        const plan = Array.isArray(blueprint?.plan) ? blueprint.plan : [];
        for (const item of plan as Array<{
            id?: string;
            data?: Record<string, { goal?: number }>;
        }>) {
            if (item.id !== m.plan.itemId) continue;
            const metric = item.data?.[m.plan.metricKey];
            if (metric && typeof metric === "object") {
                clamps.push({
                    module: m.plan.module,
                    name: m.plan.name,
                    from: m.plan.goal,
                    to: clamped,
                });
                metric.goal = clamped;
            }
        }
    }
    return clamps;
}
