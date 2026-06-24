// lib/date-utils.ts
// Use dynamic import so this module is safe to import in non-Next.js contexts (e.g. MCP server).
// Outside Next.js the import fails gracefully and falls back to the real current date.

export async function getAppDate(): Promise<Date> {
    try {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        const simulatedDate = cookieStore.get("dev-simulated-date")?.value;
        if (simulatedDate) {
            const date = new Date(simulatedDate);
            if (!isNaN(date.getTime())) return date;
        }
    } catch {
        // Not running inside Next.js — fall through to real date
    }
    return new Date();
}

/** *normalize dates for Prisma queries
 * to ensure we always search for the "start of the day".
 */
export async function getNormalizedAppDate(): Promise<Date> {
    const date = await getAppDate();
    date.setHours(0, 0, 0, 0);
    return date;
}
