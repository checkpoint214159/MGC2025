"use client";

import { useTransition } from "react";
import { useSession } from "next-auth/react";
import { fetchStateAction } from "@/lib/actions";
import { Button } from "@/components/ui/primitives";

export default function ForceGenerateButton({
    normalizedDate,
}: {
    normalizedDate: Date;
}) {
    const [isPending, startTransition] = useTransition();
    const { update } = useSession();

    const handleForceGenerate = () => {
        startTransition(async () => {
            try {
                await fetchStateAction(normalizedDate, true); // admin_force=true
                await update();
            } catch (error) {
                console.error("Failed to force state:", error);
            }
        });
    };

    return (
        <Button
            variant="secondary"
            size="sm"
            loading={isPending}
            onClick={handleForceGenerate}
        >
            {isPending ? "Processing…" : "Force regenerate plan"}
        </Button>
    );
}
