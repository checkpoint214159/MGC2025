/**
 * Graduated-progression ENVELOPE (docs/PLAN_DISTANCE.md §4) — the piece that makes numeric
 * plan-distance recovery-aware. Early plans are gentle; capacity grows along the arc, so a
 * generated goal should be compared to the ANCHOR goal scaled by expected capacity, not to
 * the raw anchor number. Deviation is only charged OUTSIDE a tolerance band around that
 * expectation ("similarity in numeric values, but only until some extremeness factor").
 *
 * Pure and dependency-free — the numeric dual of lib/engagement/arc.ts getExpectedRecovery
 * (pain eases out downward; capacity eases in upward).
 */

export interface EnvelopeParams {
    /** Total headroom over the arc: capacity at arc end = (1 + gain) × start. */
    gain: number;
    /** Tolerance band half-width around expected (0.25 = ±25%). */
    beta: number;
}

export const DEFAULT_ENVELOPE: EnvelopeParams = {
    gain: Number(process.env.PLAN_ENVELOPE_GAIN ?? 1.5),
    beta: Number(process.env.PLAN_ENVELOPE_BETA ?? 0.25),
};

/** Decelerating ease-in: fast early gains, leveling off late (mirror of the pain curve). */
function easeIn(t: number): number {
    const c = Math.min(Math.max(t, 0), 1);
    return 1 - Math.pow(1 - c, 2);
}

/** Relative capacity at recovery day `d` (1 at day `anchorDay`, up to 1+gain at arc end). */
export function capacityAt(
    day: number,
    anchorDay: number,
    arcDays: number,
    gain: number = DEFAULT_ENVELOPE.gain,
): number {
    if (arcDays <= anchorDay) return 1;
    const t = (day - anchorDay) / (arcDays - anchorDay);
    return 1 + gain * easeIn(t);
}

export interface Envelope {
    expected: number;
    lower: number;
    upper: number;
}

/**
 * Expected goal + tolerance band for a task whose anchor goal was `anchorGoal`, set on
 * recovery day `anchorDay`, evaluated at recovery day `day` of an `arcDays` arc.
 */
export function expectedEnvelope(
    anchorGoal: number,
    day: number,
    anchorDay: number,
    arcDays: number,
    params: EnvelopeParams = DEFAULT_ENVELOPE,
): Envelope {
    const scale =
        capacityAt(day, anchorDay, arcDays, params.gain) /
        capacityAt(anchorDay, anchorDay, arcDays, params.gain);
    const expected = anchorGoal * scale;
    return {
        expected,
        lower: expected / (1 + params.beta),
        upper: expected * (1 + params.beta),
    };
}

/**
 * Signed relative excursion outside the band: 0 inside; >0 = fraction above upper
 * (too aggressive); <0 = fraction below lower (backsliding / under-progressing).
 */
export function bandDeviation(goal: number, env: Envelope): number {
    if (goal > env.upper) return (goal - env.upper) / env.upper;
    if (goal < env.lower) return -((env.lower - goal) / env.lower);
    return 0;
}

/** Project an out-of-band goal back to the nearest band edge (the deterministic clamp). */
export function clampToEnvelope(goal: number, env: Envelope): number {
    if (goal > env.upper) return env.upper;
    if (goal < env.lower) return env.lower;
    return goal;
}
