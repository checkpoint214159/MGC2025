"use client";

import { ReactNode } from "react";
import { LayoutGrid, SignalHigh, Wifi, BatteryFull } from "lucide-react";

/**
 * A centred on-screen iPhone mockup for screen-recording the patient journey.
 *
 * The inner screen is a true 19.5:9 (393×852 logical points — iPhone 15/16 base),
 * scaled to fit the viewport height, with a Dynamic Island, a 9:41 status bar and a
 * home indicator. Content scrolls inside the screen. Drops the desktop nav so the
 * recording is clean; a small corner link (easily cropped out) stays for jumping
 * between screens between takes.
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
    return (
        <div className="relative flex min-h-screen w-full items-center justify-center bg-neutral-200 p-4 dark:bg-neutral-900">
            {/* Corner nav — outside the device, croppable */}
            <a
                href="/preview"
                className="absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-neutral-500 hover:bg-black/5 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-neutral-100"
            >
                <LayoutGrid size={15} strokeWidth={1.75} />
                All pages
            </a>

            {/* Device bezel */}
            <div className="rounded-[3.2rem] bg-neutral-950 p-[11px] shadow-2xl ring-1 ring-black/20">
                {/* Screen — 19.5:9, height-capped to the viewport */}
                <div className="relative aspect-[9/19.5] max-h-[88vh] w-auto overflow-hidden rounded-[2.5rem] bg-bg">
                    {/* Status bar */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex h-11 items-center justify-between px-7 text-ink">
                        <span className="text-[15px] font-semibold tabular-nums">9:41</span>
                        <div className="flex items-center gap-1.5">
                            <SignalHigh size={17} strokeWidth={2.25} />
                            <Wifi size={16} strokeWidth={2.25} />
                            <BatteryFull size={22} strokeWidth={1.75} />
                        </div>
                    </div>

                    {/* Dynamic Island */}
                    <div className="pointer-events-none absolute left-1/2 top-2 z-30 h-[26px] w-[92px] -translate-x-1/2 rounded-full bg-neutral-950" />

                    {/* Scrollable screen content — padded clear of the status bar and home indicator */}
                    <div className="h-full overflow-y-auto pt-11 pb-7">
                        {children}
                    </div>

                    {/* Home indicator */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-2 z-20 flex justify-center">
                        <div className="h-[5px] w-[36%] rounded-full bg-ink/25" />
                    </div>
                </div>
            </div>
        </div>
    );
}
