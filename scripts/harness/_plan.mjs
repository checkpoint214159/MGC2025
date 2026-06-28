// Plan extraction + log-update building for the policy harness.
//
// Turns a generated State into (a) the task list shown to the patient-simulator and
// (b) the per-module `log` payloads that apply the simulator's chosen values. A "task" is a
// goal-bearing metric (goal > 0) on a trackable, mirroring the backend compliance definition
// (lib/engagement/compliance.ts). Pain (goal 0, on the symptoms module) is NOT a task — it's
// carried separately and written onto the symptoms metric.

/**
 * Walk a state's modules → trackables → metrics and emit one numbered task per goal-bearing
 * metric. Returns { tasks, index } where index maps task number → location for rebuilding.
 */
export function extractTasks(state) {
    const tasks = [];
    const index = new Map(); // n → { moduleId, trackableId, metricKey, goal, unit }
    let n = 0;

    for (const mod of state?.modules ?? []) {
        const trackables = mod.progress?.trackables ?? [];
        for (const t of trackables) {
            const data = t.data ?? {};
            for (const [metricKey, metric] of Object.entries(data)) {
                if (!metric || typeof metric !== "object") continue;
                const goal = Number(metric.goal ?? 0);
                if (!(goal > 0)) continue; // symptoms (goal 0) and untracked metrics excluded
                n += 1;
                const name = t.meta?.name ?? metricKey;
                tasks.push({
                    n,
                    label: `${mod.type}:${name}`,
                    goal,
                    unit: metric.unit ?? "",
                });
                index.set(n, {
                    moduleId: mod.id,
                    trackableId: t.id,
                    metricKey,
                    goal,
                    unit: metric.unit ?? "",
                });
            }
        }
    }
    return { tasks, index };
}

/** Locate the pain metric on the symptoms module (data.pain, else any metric with type "pain"). */
function findPain(state) {
    const sym = (state?.modules ?? []).find((m) => m.type === "symptoms");
    for (const t of sym?.progress?.trackables ?? []) {
        const data = t.data ?? {};
        if (data.pain) return { moduleId: sym.id, trackableId: t.id, key: "pain" };
        for (const [k, v] of Object.entries(data)) {
            if (v?.type === "pain") return { moduleId: sym.id, trackableId: t.id, key: k };
        }
    }
    return null;
}

/**
 * Build per-module log payloads from the simulator's actions + pain.
 * Returns [{ moduleId, updates: [{ id, data }] }] for every module that changed.
 *
 * @param {object} state
 * @param {{n:number,value:number}[]} actions
 * @param {{tasks:any[],index:Map}} extracted  result of extractTasks(state)
 * @param {number|null} pain
 */
export function buildUpdates(state, actions, extracted, pain) {
    const valueByN = new Map(actions.map((a) => [a.n, a.value]));

    // Deep clone each module's trackables so we can mutate freely.
    const byModule = new Map(); // moduleId → trackables[]
    for (const mod of state?.modules ?? []) {
        byModule.set(
            mod.id,
            JSON.parse(JSON.stringify(mod.progress?.trackables ?? [])),
        );
    }

    const changed = new Set();

    // Apply task values.
    for (const [n, loc] of extracted.index.entries()) {
        if (!valueByN.has(n)) continue;
        const trackables = byModule.get(loc.moduleId);
        const t = trackables?.find((x) => x.id === loc.trackableId);
        if (!t?.data?.[loc.metricKey]) continue;
        const v = Math.max(0, Number(valueByN.get(n)));
        t.data[loc.metricKey].value = v;
        changed.add(loc.moduleId);
    }

    // Apply pain onto the symptoms module.
    if (pain !== null && pain !== undefined) {
        const loc = findPain(state);
        if (loc) {
            const trackables = byModule.get(loc.moduleId);
            const t = trackables?.find((x) => x.id === loc.trackableId);
            if (t?.data?.[loc.key]) {
                t.data[loc.key].value = Math.max(0, Math.min(10, Number(pain)));
                changed.add(loc.moduleId);
            }
        }
    }

    return [...changed].map((moduleId) => ({
        moduleId,
        updates: byModule.get(moduleId).map((t) => ({ id: t.id, data: t.data })),
    }));
}

/** Succinct per-task log string, e.g. "exercise:Leg lifts 7/10reps · nutrition:Protein 80/100g". */
export function formatTaskLog(tasks, actions) {
    const valueByN = new Map(actions.map((a) => [a.n, a.value]));
    return tasks
        .map((t) => `${t.label} ${valueByN.get(t.n) ?? 0}/${t.goal}${t.unit}`)
        .join(" · ");
}
