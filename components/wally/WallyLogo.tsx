import { cn } from "@/lib/utils";

/**
 * The Wally logo badge — the seal mark on its light-blue tile (public/wally/wally.png).
 * `size` is the badge edge in px; the image is cropped square and rounded.
 */
export function WallyLogo({
    size = 28,
    className,
}: {
    size?: number;
    className?: string;
}) {
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src="/wally/wally.png"
            alt="Wally"
            width={size}
            height={size}
            style={{ width: size, height: size }}
            className={cn("shrink-0 rounded-[24%] object-cover", className)}
        />
    );
}
