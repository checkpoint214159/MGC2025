import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function ensureAction<T>(result: { success: boolean; data?: T; error?: string }): T {
    if (!result.success || result.data === undefined) {
        throw new Error(result.error || "Action failed");
    }
    return result.data;
}
