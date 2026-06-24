"use client";
import { useRef } from "react";
import { Calendar, CalendarClock, RotateCcw } from "lucide-react";
import { useAppDate } from "@/context/DateContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/**
 * Development tool for simulating different dates.
 * Only visible in non-production environments.
 */

// Format/parse in LOCAL time — toISOString() is UTC and shifts the day in any
// timezone west of GMT, which made the switcher show/select the wrong date.
const toLocalYMD = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate(),
    ).padStart(2, "0")}`;

export function DevDateSwitcher() {
    const { isSimulated, displayDate } = useAppDate();
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);

    if (process.env.NODE_ENV === "production") return null;

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.value) return;
        const [y, m, d] = e.target.value.split("-").map(Number);
        const newDate = new Date(y, m - 1, d); // local midnight
        document.cookie = `dev-simulated-date=${newDate.toISOString()}; path=/; max-age=86400`;
        router.refresh();
    };

    const openPicker = () => {
        // showPicker() is the reliable way to open the native calendar; clicking the
        // field's indicator is flaky across browsers. Guard it — it throws without a
        // user gesture and isn't implemented everywhere.
        try {
            inputRef.current?.showPicker?.();
        } catch {
            inputRef.current?.focus();
        }
    };

    const reset = () => {
        document.cookie =
            "dev-simulated-date=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        router.refresh();
    };

    return (
        <div
            className={cn(
                "fixed bottom-4 right-4 z-50 w-[260px] rounded-lg border bg-surface p-4 shadow-lg",
                isSimulated
                    ? "border-attention bg-attention-soft"
                    : "border-border",
            )}
        >
            <div className="mb-2.5 flex items-center gap-1.5">
                <CalendarClock
                    size={13}
                    strokeWidth={2}
                    className={
                        isSimulated ? "text-attention-ink" : "text-ink-subtle"
                    }
                />
                <p
                    className={cn(
                        "text-[10px] font-bold uppercase tracking-widest",
                        isSimulated ? "text-attention-ink" : "text-ink-subtle",
                    )}
                >
                    {isSimulated ? "Time travel active" : "System clock"}
                </p>
            </div>

            <div className="relative">
                <input
                    ref={inputRef}
                    type="date"
                    value={toLocalYMD(displayDate)}
                    onChange={handleDateChange}
                    onClick={openPicker}
                    className={cn(
                        "h-10 w-full cursor-pointer rounded-md border border-border-strong bg-surface",
                        "pl-3 pr-10 text-[14px] tabular-nums text-ink outline-none [color-scheme:light]",
                        "focus:border-accent focus:ring-2 focus:ring-ring",
                        "[&::-webkit-calendar-picker-indicator]:hidden",
                    )}
                />
                <button
                    type="button"
                    onClick={openPicker}
                    aria-label="Open calendar"
                    className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded text-ink-subtle transition-colors hover:bg-surface-sunken hover:text-ink"
                >
                    <Calendar size={16} strokeWidth={1.75} />
                </button>
            </div>

            {isSimulated && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={reset}
                    className="mt-2 w-full"
                >
                    <RotateCcw size={14} strokeWidth={2} /> Reset to today
                </Button>
            )}
        </div>
    );
}
