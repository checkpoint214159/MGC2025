// lib/date-utils.ts
import { cookies } from 'next/headers';

export async function getAppDate(): Promise<Date> {
  // 1. Check if we're in a server context and have a dev cookie
  const cookieStore = await cookies();
  const simulatedDate = cookieStore.get('dev-simulated-date')?.value;

  if (simulatedDate) {
    const date = new Date(simulatedDate);
    if (!isNaN(date.getTime())) return date;
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