import { cn } from "@/lib/utils";

/**
 * The Wally mascot — the sea-lion character (public/wally/wally_seal.png, cropped from
 * the full lockup so there's no wordmark). `mix-blend-multiply` drops the image's white
 * background into whatever light surface it sits on. `size` is the rendered width in px;
 * `pose` is accepted for API compatibility but the mark is a single illustration.
 */
export function WallyMascot({
    size = 132,
    className,
}: {
    pose?: "wave" | "thumbs-up";
    size?: number;
    className?: string;
}) {
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src="/wally/wally_seal.png"
            alt="Wally"
            style={{ width: size, height: "auto" }}
            className={cn("mix-blend-multiply", className)}
        />
    );
}
