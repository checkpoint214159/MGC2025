"use client";

import { useState } from "react";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Renders the Wally mascot from a user-supplied asset in /public/wally/{pose}.png.
 * Until that file exists (or if it 404s), falls back to a lucide Bot in a soft accent
 * circle — so screens build and look intentional before the real art is dropped in.
 * The halo/fallback pick up whatever accent the surrounding PhaseScope sets.
 */
export function WallyMascot({
    pose = "wave",
    size = 132,
    className,
}: {
    pose?: "wave" | "thumbs-up";
    size?: number;
    className?: string;
}) {
    const [failed, setFailed] = useState(false);

    return (
        <div
            className={cn("relative grid place-items-center", className)}
            style={{ width: size, height: size }}
        >
            <div className="absolute inset-0 rounded-full bg-accent-soft/60 blur-xl" aria-hidden />
            {failed ? (
                <div
                    className="relative grid place-items-center rounded-full bg-accent-soft text-accent-ink"
                    style={{ width: size * 0.82, height: size * 0.82 }}
                >
                    <Bot size={size * 0.42} strokeWidth={1.5} aria-label="Wally" />
                </div>
            ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={`/wally/${pose}.png`}
                    alt="Wally"
                    width={size}
                    height={size}
                    onError={() => setFailed(true)}
                    className="relative object-contain"
                    style={{ width: size, height: size }}
                />
            )}
        </div>
    );
}
