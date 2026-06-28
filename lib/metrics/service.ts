import { prisma } from "@/lib/prisma";
import { StateSchema, type State } from "@/lib/state/schemas/state";
import { getDayCompliance } from "@/lib/engagement/compliance";
import { getStatePain } from "@/lib/engagement/arc";
import { createLogger } from "@/lib/logger";

const log = createLogger("metrics");

/**
 * Persisted daily metrics (DailyMetric table): one row per patient per day holding the
 * computed COMPLIANCE (% of goal-bearing tasks done across all modules) and PAIN score.
 * Recomputed from the day's State whenever progress is logged, so flags / notifications /
 * reports read a stable series instead of re-deriving from module JSON each time.
 */

/** Normalize a Date to date-only (midnight UTC) so it matches the @db.Date column + unique key. */
function dateOnly(d: Date): Date {
    return new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
    );
}

export async function upsertDailyMetric(input: {
    userId: string;
    date: Date;
    compliancePct: number | null;
    completedTasks: number;
    totalTasks: number;
    painScore: number | null;
}) {
    const date = dateOnly(input.date);
    const data = {
        compliancePct: input.compliancePct,
        completedTasks: input.completedTasks,
        totalTasks: input.totalTasks,
        painScore: input.painScore,
    };

    // Neon HTTP: no upsert-with-transaction — do findUnique → update/create by id.
    const existing = await prisma.dailyMetric.findUnique({
        where: { userId_date: { userId: input.userId, date } },
    });
    if (existing) {
        return prisma.dailyMetric.update({ where: { id: existing.id }, data });
    }
    return prisma.dailyMetric.create({
        data: { userId: input.userId, date, ...data },
    });
}

export async function getDailyMetrics(userId: string) {
    return prisma.dailyMetric.findMany({
        where: { userId },
        orderBy: { date: "asc" },
    });
}

/**
 * Recompute and persist the daily metric for the day the given module belongs to.
 * Loads the module's full State (all modules + progress), derives compliance + pain,
 * and upserts the row. Non-fatal: logs and swallows errors so progress logging never
 * breaks because a derived metric failed.
 */
export async function recomputeDailyMetricForModule(
    moduleId: string,
): Promise<void> {
    try {
        const mod = await prisma.module.findUnique({
            where: { id: moduleId },
            select: { stateId: true },
        });
        if (!mod) return;

        const stateRow = await prisma.state.findUnique({
            where: { id: mod.stateId },
            include: { modules: { include: { progress: true } } },
        });
        if (!stateRow) return;

        const state: State = StateSchema.parse(stateRow);
        const { pct, completedTasks, totalTasks } = getDayCompliance(state);
        const painScore = getStatePain(state);

        await upsertDailyMetric({
            userId: stateRow.userId,
            date: new Date(stateRow.dateCreated),
            compliancePct: pct,
            completedTasks,
            totalTasks,
            painScore,
        });
        log.info(
            `${stateRow.userId} ${new Date(stateRow.dateCreated)
                .toISOString()
                .slice(0, 10)} → compliance ${
                pct ?? "—"
            }% (${completedTasks}/${totalTasks}), pain ${painScore ?? "—"}`,
        );
    } catch (e: unknown) {
        log.error(
            `recompute failed for module ${moduleId}:`,
            (e as Error).message,
        );
    }
}
